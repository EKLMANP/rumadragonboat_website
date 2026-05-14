import React, { useEffect, useState } from 'react';
import { X, Users, Loader2, Calendar, MapPin } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';

const RegistrantsModal = ({ isOpen, activity, onClose }) => {
    const { lang } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [registrants, setRegistrants] = useState([]);

    useEffect(() => {
        if (!isOpen || !activity?.id) return;

        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setRegistrants([]);

            const { data: regs, error: regsErr } = await supabase
                .from('activity_registrations')
                .select('user_id, created_at')
                .eq('activity_id', activity.id)
                .order('created_at', { ascending: true });

            if (cancelled) return;
            if (regsErr || !regs || regs.length === 0) {
                setRegistrants([]);
                setLoading(false);
                return;
            }

            const userIds = regs.map(r => r.user_id).filter(Boolean);

            // Step A: match by user_id
            const { data: byUserId } = userIds.length > 0
                ? await supabase.from('members').select('name, user_id').in('user_id', userIds)
                : { data: [] };

            const nameByUserId = new Map((byUserId || []).map(m => [m.user_id, m.name]));
            const missingUserIds = userIds.filter(id => !nameByUserId.has(id));

            // Step B: fallback via email for legacy accounts
            if (missingUserIds.length > 0) {
                const { data: authUsers } = await supabase.rpc('admin_list_users_with_roles');
                const missingEmailsByUserId = new Map(
                    (authUsers || [])
                        .filter(u => missingUserIds.includes(u.user_id) && u.email)
                        .map(u => [u.user_id, u.email.toLowerCase()])
                );
                if (missingEmailsByUserId.size > 0) {
                    const { data: allMembers } = await supabase.from('members').select('name, email');
                    const nameByEmail = new Map(
                        (allMembers || [])
                            .filter(m => m.email)
                            .map(m => [m.email.toLowerCase(), m.name])
                    );
                    missingEmailsByUserId.forEach((email, uid) => {
                        const name = nameByEmail.get(email);
                        if (name) nameByUserId.set(uid, name);
                    });
                }
            }

            if (cancelled) return;
            setRegistrants(regs.map(r => ({
                user_id: r.user_id,
                name: nameByUserId.get(r.user_id) || '—',
            })));
            setLoading(false);
        };

        load();
        return () => { cancelled = true; };
    }, [isOpen, activity?.id]);

    if (!isOpen || !activity) return null;

    const count = registrants.length;

    return (
        <div
            className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-sky-500 to-cyan-500 p-4 flex justify-between items-start text-white">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Users size={22} />
                            {lang === 'zh' ? '已報名名單' : 'Registered Participants'}
                        </h3>
                        <div className="text-sm opacity-95 mt-1 truncate">{activity.name}</div>
                        <div className="flex flex-wrap gap-3 text-xs opacity-90 mt-1">
                            {activity.date && (
                                <span className="flex items-center gap-1">
                                    <Calendar size={12} /> {activity.date}
                                </span>
                            )}
                            {activity.location && (
                                <span className="flex items-center gap-1">
                                    <MapPin size={12} /> {activity.location}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="hover:bg-white/20 rounded-full p-1 transition shrink-0"
                        aria-label="Close"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-4 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <Loader2 className="animate-spin mb-2" size={28} />
                            <span className="text-sm">{lang === 'zh' ? '載入中...' : 'Loading...'}</span>
                        </div>
                    ) : count === 0 ? (
                        <div className="text-center py-10 text-gray-400">
                            <div className="text-4xl mb-2">🌱</div>
                            <div className="text-sm">
                                {lang === 'zh' ? '目前還沒有人報名，當第一個吧！' : 'No one has registered yet — be the first!'}
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="text-xs text-gray-500 mb-3">
                                {lang === 'zh' ? `共 ${count} 人已報名` : `${count} registered`}
                            </div>
                            <ul className="divide-y divide-gray-100">
                                {registrants.map((r, idx) => (
                                    <li
                                        key={`${r.user_id}-${idx}`}
                                        className="flex items-center gap-3 py-2.5"
                                    >
                                        <span className="w-8 h-8 flex items-center justify-center rounded-full bg-sky-50 text-sky-600 font-semibold text-sm shrink-0">
                                            {idx + 1}
                                        </span>
                                        <span className="text-gray-800 truncate">{r.name}</span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RegistrantsModal;
