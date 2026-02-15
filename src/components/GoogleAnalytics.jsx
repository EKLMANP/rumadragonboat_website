import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';

const GoogleAnalytics = () => {
    const location = useLocation();
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;

        if (measurementId) {
            ReactGA.initialize(measurementId);
            setInitialized(true);
            console.log('GA Initialized with:', measurementId);
        } else {
            console.warn('Google Analytics Measurement ID not found in environment variables.');
        }
    }, []);

    useEffect(() => {
        if (initialized) {
            ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
        }
    }, [initialized, location]);

    return null;
};

export default GoogleAnalytics;
