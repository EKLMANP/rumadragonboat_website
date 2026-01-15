import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { X, Upload, MessageSquareWarning, Loader2, Heart } from 'lucide-react';
import { submitBugReport } from '../api/supabaseApi';

const BugReportModal = ({ isOpen, onClose }) => {
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!description.trim()) {
            Swal.fire('請填寫描述', '告訴我們發生了什麼問題吧', 'warning');
            return;
        }

        setLoading(true);
        try {
            const res = await submitBugReport({
                description,
                screenshotFile: file
            });

            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: '感謝你的幫忙',
                    html: 'RUMA有你真好 <span style="color:red">❤</span>',
                    confirmButtonColor: '#ff4d4f'
                });
                onClose();
                setDescription('');
                setFile(null);
                setPreview('');
            } else {
                Swal.fire('提交失敗', res.message, 'error');
            }
        } catch (error) {
            Swal.fire('提交失敗', error.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-500 to-pink-500 p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <MessageSquareWarning size={24} /> 回報問題 (Bug Report)
                    </h3>
                    <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1 transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                問題描述
                            </label>
                            <textarea
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-200 outline-none min-h-[100px] text-gray-800"
                                placeholder="請描述您遇到的問題，例如：在什麼頁面、點了什麼按鈕..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                畫面截圖 (選填)
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:bg-gray-50 transition cursor-pointer relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                {preview ? (
                                    <div className="relative">
                                        <img src={preview} alt="Preview" className="max-h-32 mx-auto rounded-lg shadow-sm" />
                                        <div className="text-xs text-gray-500 mt-2">點擊更換圖片</div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-gray-400">
                                        <Upload size={32} className="mb-2" />
                                        <span>點擊上傳截圖</span>
                                        <span className="text-xs mt-1">支援 JPG, PNG</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg hover:from-red-600 hover:to-pink-600 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : '送出回報'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default BugReportModal;
