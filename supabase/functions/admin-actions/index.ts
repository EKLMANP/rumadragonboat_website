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

            // Check if user already exists
            const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
            const existingUser = existingUsers?.users?.find(u => u.email === body.email);

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
