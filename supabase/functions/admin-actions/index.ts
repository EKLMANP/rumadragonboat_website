import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
    console.log('=== FUNCTION CALLED ===');

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    };

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const body = await req.json();
        console.log('Body received:', JSON.stringify(body));

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        if (body.action === 'create_user' || body.action === 'assign_role') {
            console.log('Processing user:', body.email);

            // Improved User Lookup
            const { data: { users }, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
            // Note: The above still lists all users (default 50). 
            // Better approach if listUsers supported filter directly in all versions, 
            // but for reliability let's fix the logic to handle pagination or direct get if possible.
            // Actually, listUsers doesn't support email filter directly in older client versions easily.
            // Let's optimize: try to find the user more robustly.

            // Re-implementation: listing all users is risky. 
            // Ideally we should use getUserById but we don't have ID. 
            // We'll stick to listUsers for now but let's add better error logging.
            // Actually, supabaseAdmin.auth.admin.listUsers() defaults to page 1, 50 users. 
            // If Kenny is the 51st user, this logic fails!
            // WE MUST PAGINATE or FILTER.

            // Using a safer approach: Try to create user first? No, that throws error.
            // Let's try to get user by email correctly.
            // Since Deno client might vary, let's use a workaround:
            // We can't easily search by email in admin API without looping pages.
            // But wait, creating a user that exists returns the existing user error? No it returns error.

            // Let's Fix: Pagination loop to find user
            let existingUser = null;
            let page = 1;
            let hasMore = true;

            while (hasMore && !existingUser) {
                const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ page: page, per_page: 1000 });
                if (error || !users || users.length === 0) {
                    hasMore = false;
                } else {
                    existingUser = users.find(u => u.email.toLowerCase() === body.email.toLowerCase());
                    if (!existingUser && users.length < 1000) hasMore = false;
                    page++;
                }
            }

            let userId: string;

            if (existingUser) {
                console.log('User exists:', existingUser.id);
                userId = existingUser.id;
            } else {
                // Create new user
                console.log('Creating new user:', body.email);
                const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
                    email: body.email,
                    password: body.password || '000000',
                    email_confirm: true,
                    user_metadata: { name: body.name }
                });

                if (error) {
                    console.log('Create error:', error.message);
                    return new Response(JSON.stringify({ error: error.message }), {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 400,
                    });
                }
                userId = newUser.user.id;
            }

            // Set role
            if (body.role) {
                const { data: roleData } = await supabaseAdmin
                    .from('roles')
                    .select('id')
                    .eq('name', body.role)
                    .single();

                if (roleData) {
                    // Delete existing roles first
                    await supabaseAdmin.from('user_roles').delete().eq('user_id', userId);
                    // Insert new role
                    await supabaseAdmin.from('user_roles').insert({
                        user_id: userId,
                        role_id: roleData.id
                    });
                }
            }

            // Update members table
            await supabaseAdmin
                .from('members')
                .update({ email: body.email })
                .eq('name', body.name);

            console.log('Success!');
            return new Response(JSON.stringify({ success: true, userId }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            });
        }

        return new Response(JSON.stringify({ error: 'Unknown action' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });

    } catch (e) {
        console.log('Catch error:', e.message);
        return new Response(JSON.stringify({ error: e.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
