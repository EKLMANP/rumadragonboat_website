/**
 * 圖片處理工具函式
 */

/**
 * 壓縮圖片
 * @param {File} file - 原始圖片檔案
 * @param {Object} options - 壓縮選項
 * @param {number} options.maxWidth - 最大寬度 (預設 1280)
 * @param {number} options.quality - 圖片品質 0-1 (預設 0.7)
 * @returns {Promise<Blob>} 壓縮後的圖片 Blob
 */
export const compressImage = (file, options = {}) => {
    const { maxWidth = 1280, quality = 0.7 } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // 計算等比例縮放
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Canvas to Blob failed'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};
