import React from 'react';

const LoadingSpinner = () => {
    return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="relative w-16 h-16">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-sky-200 rounded-full animate-pulse"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-sky-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
        </div>
    );
};

export default LoadingSpinner;
