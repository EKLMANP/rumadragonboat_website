import { useEffect } from 'react';
import TagManager from 'react-gtm-module';

const GoogleTagManager = () => {
    useEffect(() => {
        const gtmId = import.meta.env.VITE_GTM_ID;

        if (gtmId && gtmId !== 'GTM-XXXXXX') {
            const tagManagerArgs = {
                gtmId: gtmId
            };
            TagManager.initialize(tagManagerArgs);
            console.log('GTM Initialized with:', gtmId);
        } else {
            console.warn('Google Tag Manager ID not found or is placeholder.');
        }
    }, []);

    return null;
};

export default GoogleTagManager;
