<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RUMA Dragon Boat Team | Official Site</title>
    
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

    <!-- FontAwesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <!-- Fonts: Oswald (Headings) & Roboto (Body) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;700&family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">

    <!-- Tailwind Config -->
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        ruma: {
                            black: '#0a0a0a',
                            dark: '#121212',
                            red: '#D90429',
                            redDark: '#8d0000',
                            gray: '#f3f4f6',
                            textGray: '#9ca3af'
                        }
                    },
                    fontFamily: {
                        sans: ['Roboto', 'sans-serif'],
                        display: ['Oswald', 'sans-serif'],
                    },
                    skew: {
                        '12': '12deg',
                        '-12': '-12deg',
                    }
                }
            }
        }
    </script>

    <style>
        /* Base & Reset */
        body {
            background-color: #0a0a0a;
            color: #f3f4f6;
            overflow-x: hidden;
            font-family: 'Roboto', sans-serif;
        }

        h1, h2, h3, h4, h5, h6 {
            font-family: 'Oswald', sans-serif;
        }

        /* Hero Video */
        .video-bg {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            z-index: -1;
            filter: brightness(0.4);
        }

        /* Navigation Transitions */
        .nav-scrolled {
            background-color: rgba(10, 10, 10, 0.95);
            backdrop-filter: blur(10px);
            padding-top: 1rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid #222;
        }
        .nav-transparent {
            background-color: transparent;
            padding-top: 1.5rem;
            padding-bottom: 1.5rem;
        }

        /* Chart Container (Strict adherence to prompt requirements) */
        .chart-container {
            position: relative;
            width: 100%;
            max-width: 600px;
            height: 350px; /* Mobile height */
            max-height: 400px;
            margin-left: auto;
            margin-right: auto;
        }
        @media (min-width: 768px) {
            .chart-container {
                height: 400px; /* Desktop height */
            }
        }

        /* Utilities */
        .text-shadow-lg {
            text-shadow: 2px 2px 4px rgba(0,0,0,0.6);
        }
        
        /* Skewed Button Logic */
        .btn-skew {
            transform: skewX(-12deg);
            transition: all 0.3s ease;
        }
        .btn-skew:hover {
            transform: skewX(-12deg) translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(217, 4, 41, 0.3);
        }
        .btn-skew > span {
            transform: skewX(12deg);
            display: inline-block;
        }

        /* Image Object Fit Helpers for Split Layout */
        .split-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            min-height: 400px;
        }
    </style>

    <!-- Placeholder Comments Required -->
    <!-- Chosen Palette: RUMA Brand (Deep Black #0a0a0a, Vibrant Red #D90429, White Text) -->
    <!-- Application Structure Plan: 
         1. Hero Section: Video background hook, emotional connection.
         2. Split-Screen Layouts (About & Why RUMA): "Sportz" style zig-zag pattern for high visual impact and better reading rhythm.
         3. Dashboard/Stats: Data visualization to prove competence (Social Proof).
         4. History: Timeline of achievements.
         5. Footer/CTA: Conversion point.
         User Flow: Linear vertical scroll with sticky navigation for quick access. i18n toggles state instantly. -->
    <!-- Visualization & Content Choices: 
         1. Split Layouts -> Goal: Inform & Engage -> Method: 50/50 CSS Grid -> Justification: Breaks monotony, allows large imagery alongside focused text.
         2. Radar Chart -> Goal: Compare -> Method: Chart.js -> Justification: Shows multi-faceted team strengths (Power/Sync/Endurance) better than simple bars.
         3. Counters -> Goal: Inform -> Method: JS Animation -> Justification: Quick numerical impact.
         4. Video BG -> Goal: Wow Factor -> Method: HTML5 Video -> Justification: Captures the speed and energy of the sport. 
         Confirming NO SVG graphics used. NO Mermaid JS used. -->
    <!-- CONFIRMATION: NO SVG graphics used. NO Mermaid JS used. -->
</head>
<body class="antialiased">

    <!-- Navigation -->
    <nav id="navbar" class="fixed w-full z-50 transition-all duration-300 nav-transparent border-b border-transparent">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between">
                <!-- Logo -->
                <div class="flex-shrink-0 cursor-pointer" onclick="window.scrollTo(0,0)">
                    <span class="font-display text-3xl font-bold italic tracking-wider text-white">
                        RUMA<span class="text-ruma-red">.</span>
                    </span>
                </div>
                
                <!-- Desktop Menu -->
                <div class="hidden md:block">
                    <div class="ml-10 flex items-baseline space-x-8">
                        <a href="#home" class="hover:text-ruma-red transition-colors duration-300 px-3 py-2 text-sm font-bold uppercase tracking-widest text-white" data-i18n="nav_home">Home</a>
                        <a href="#about" class="hover:text-ruma-red transition-colors duration-300 px-3 py-2 text-sm font-bold uppercase tracking-widest text-white" data-i18n="nav_about">About Us</a>
                        <a href="#articles" class="hover:text-ruma-red transition-colors duration-300 px-3 py-2 text-sm font-bold uppercase tracking-widest text-white" data-i18n="nav_articles">Articles</a>
                        <a href="#videos" class="hover:text-ruma-red transition-colors duration-300 px-3 py-2 text-sm font-bold uppercase tracking-widest text-white" data-i18n="nav_videos">Videos</a>
                        <a href="#contact" class="hover:text-ruma-red transition-colors duration-300 px-3 py-2 text-sm font-bold uppercase tracking-widest text-white" data-i18n="nav_contact">Contact</a>
                    </div>
                </div>

                <!-- Right Actions -->
                <div class="hidden md:flex items-center gap-4">
                    <button id="lang-toggle" class="text-xs font-bold border border-white/30 text-white px-3 py-1 rounded hover:bg-ruma-red hover:border-ruma-red transition-all duration-300">
                        EN | 繁中
                    </button>
                    <!-- "Fightness" style skewed CTA -->
                    <a href="#contact" class="bg-ruma-red text-white px-6 py-2 text-sm font-bold font-display uppercase btn-skew">
                        <span data-i18n="btn_join">Join Us</span>
                    </a>
                </div>

                <!-- Mobile Menu Button -->
                <div class="-mr-2 flex md:hidden">
                    <button id="mobile-menu-btn" class="text-gray-300 hover:text-white p-2">
                        <i class="fas fa-bars text-2xl"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Mobile Menu -->
        <div id="mobile-menu" class="hidden md:hidden bg-ruma-black/95 absolute w-full border-b border-gray-800 shadow-xl">
            <div class="px-2 pt-2 pb-3 space-y-1">
                <a href="#home" class="block px-3 py-2 text-base font-medium text-white hover:text-ruma-red" data-i18n="nav_home">Home</a>
                <a href="#about" class="block px-3 py-2 text-base font-medium text-white hover:text-ruma-red" data-i18n="nav_about">About Us</a>
                <a href="#articles" class="block px-3 py-2 text-base font-medium text-white hover:text-ruma-red" data-i18n="nav_articles">Articles</a>
                <a href="#videos" class="block px-3 py-2 text-base font-medium text-white hover:text-ruma-red" data-i18n="nav_videos">Videos</a>
                <a href="#contact" class="block px-3 py-2 text-base font-medium text-white hover:text-ruma-red" data-i18n="nav_contact">Contact</a>
                <div class="mt-4 border-t border-gray-700 pt-4 px-3">
                    <button id="lang-toggle-mobile" class="w-full text-center py-2 border border-gray-600 rounded text-sm font-bold text-white hover:bg-ruma-red transition">Switch Language</button>
                </div>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section id="home" class="relative h-screen flex items-center justify-center overflow-hidden">
        <!-- Video Loop -->
        <video class="video-bg" autoplay muted loop playsinline poster="https://images.unsplash.com/photo-1544298534-192667341e1d?q=80&w=1920">
            <!-- Fallback generic video for demo purposes -->
            <source src="https://player.vimeo.com/external/494243851.sd.mp4?s=120e7939105423f03407963d7e8682976691c784&profile_id=165&oauth2_token_id=57447761" type="video/mp4">
        </video>

        <!-- Content Overlay -->
        <div class="relative z-10 text-center px-4 max-w-5xl mx-auto">
            <h1 class="font-display font-bold text-7xl md:text-9xl uppercase leading-none tracking-tighter mb-4 text-shadow-lg animate-fade-in-up">
                <span class="block text-white" data-i18n="hero_title_1">RUMA</span>
                <span class="block text-transparent bg-clip-text bg-gradient-to-r from-ruma-red to-white" data-i18n="hero_title_2">Dragon Boat</span>
            </h1>
            <p class="mt-6 text-xl md:text-2xl text-gray-200 font-light italic border-l-4 border-ruma-red pl-4 inline-block text-left" data-i18n="hero_subtitle">
                No You, No Me, Only "US"
            </p>
            <div class="mt-12 flex justify-center gap-4">
                <a href="#about" class="bg-ruma-red text-white px-8 py-4 text-lg font-bold uppercase tracking-widest btn-skew">
                    <span data-i18n="cta_primary">Start Journey</span>
                </a>
            </div>
        </div>
        
        <!-- Decorative Slant Bottom -->
        <div class="absolute bottom-0 w-full h-16 bg-ruma-black transform origin-bottom-right -skew-y-2 translate-y-8"></div>
    </section>

    <!-- 
        SPLIT LAYOUT SECTIONS 
        Adopting "Sportz" layout: 50/50 Grid
    -->

    <!-- Section A: About Us -->
    <!-- Structure: [ Left: Image | Right: Red Content ] -->
    <section id="about" class="grid grid-cols-1 md:grid-cols-2 min-h-[600px]">
        <!-- Left: Image -->
        <div class="relative h-96 md:h-auto overflow-hidden group">
            <!-- Using public/Landing page1.jpg as requested with fallback -->
            <img src="public/Landing page1.jpg" 
                 onerror="this.src='https://images.unsplash.com/photo-1550254064-a764d8db2929?q=80&w=1470&auto=format&fit=crop'"
                 alt="RUMA Team Spirit" 
                 class="split-image transition-transform duration-700 group-hover:scale-105">
            <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-500"></div>
        </div>

        <!-- Right: Content (Red) -->
        <div class="bg-ruma-red flex flex-col justify-center p-12 md:p-20 text-white relative">
            <div class="flex items-center gap-4 mb-6">
                <div class="h-1 w-12 bg-white"></div>
                <span class="font-display font-bold tracking-widest text-sm uppercase" data-i18n="about_label">About Us</span>
            </div>
            <h2 class="font-display text-4xl md:text-6xl font-bold uppercase leading-tight mb-8 drop-shadow-md" data-i18n="about_headline">
                RUMA <br>Core Values
            </h2>
            <p class="text-white/90 text-lg leading-relaxed mb-10 font-light" data-i18n="about_desc">
                RUMA is not just a team; it is a collective spirit. We forge champions through discipline, unity, and the relentless pursuit of speed. Founded in 2024, we represent the next evolution of dragon boat racing.
            </p>
            <div>
                <a href="#stats" class="inline-block border-2 border-white text-white px-8 py-3 font-bold uppercase tracking-wider hover:bg-white hover:text-ruma-red transition-all duration-300 btn-skew">
                    <span data-i18n="btn_learn">Learn More</span>
                </a>
            </div>
        </div>
    </section>

    <!-- Section B: Why Choose RUMA -->
    <!-- Structure: [ Left: Black Content | Right: Image ] -->
    <section class="grid grid-cols-1 md:grid-cols-2 min-h-[600px]">
        <!-- Left: Content (Black) -->
        <!-- Order-2 on mobile ensures it stacks below the image if we wanted strictly Image->Text, 
             but typically "Zig Zag" on mobile flows Text->Image or Image->Text consistently. 
             Here we let it flow naturally (Text on top on mobile) for readability. -->
        <div class="bg-ruma-black flex flex-col justify-center p-12 md:p-20 order-2 md:order-1 relative z-10 border-t border-gray-900 md:border-none">
            <h2 class="font-display text-4xl md:text-5xl font-bold uppercase text-white mb-12" data-i18n="why_headline">
                Why Choose <span class="text-ruma-red">RUMA</span>?
            </h2>

            <!-- Vertical Feature List -->
            <div class="space-y-10">
                <!-- Feature 1 -->
                <div class="flex gap-6 group">
                    <div class="flex-shrink-0 w-14 h-14 flex items-center justify-center border border-ruma-red rounded-sm bg-ruma-red/10 group-hover:bg-ruma-red transition-all duration-300 transform group-hover:-skew-x-12">
                        <i class="fas fa-dumbbell text-ruma-red group-hover:text-white text-xl transform group-hover:skew-x-12 transition-transform"></i>
                    </div>
                    <div>
                        <h3 class="font-display text-xl font-bold text-white uppercase mb-2 group-hover:text-ruma-red transition-colors" data-i18n="feat_1_title">Professional Training</h3>
                        <p class="text-ruma-textGray text-sm leading-relaxed" data-i18n="feat_1_desc">
                            Systemized coaching focusing on biomechanics, strength conditioning, and paddling technique optimization.
                        </p>
                    </div>
                </div>

                <!-- Feature 2 -->
                <div class="flex gap-6 group">
                    <div class="flex-shrink-0 w-14 h-14 flex items-center justify-center border border-ruma-red rounded-sm bg-ruma-red/10 group-hover:bg-ruma-red transition-all duration-300 transform group-hover:-skew-x-12">
                        <i class="fas fa-users text-ruma-red group-hover:text-white text-xl transform group-hover:skew-x-12 transition-transform"></i>
                    </div>
                    <div>
                        <h3 class="font-display text-xl font-bold text-white uppercase mb-2 group-hover:text-ruma-red transition-colors" data-i18n="feat_2_title">Team Spirit</h3>
                        <p class="text-ruma-textGray text-sm leading-relaxed" data-i18n="feat_2_desc">
                            More than a team. We are a family that pushes limits together. Cohesion is our greatest weapon on water.
                        </p>
                    </div>
                </div>

                <!-- Feature 3 -->
                <div class="flex gap-6 group">
                    <div class="flex-shrink-0 w-14 h-14 flex items-center justify-center border border-ruma-red rounded-sm bg-ruma-red/10 group-hover:bg-ruma-red transition-all duration-300 transform group-hover:-skew-x-12">
                        <i class="fas fa-trophy text-ruma-red group-hover:text-white text-xl transform group-hover:skew-x-12 transition-transform"></i>
                    </div>
                    <div>
                        <h3 class="font-display text-xl font-bold text-white uppercase mb-2 group-hover:text-ruma-red transition-colors" data-i18n="feat_3_title">Challenge Self</h3>
                        <p class="text-ruma-textGray text-sm leading-relaxed" data-i18n="feat_3_desc">
                            Break your personal records. Compete in international regattas. Discover a stronger version of yourself.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Right: Image -->
        <div class="relative h-96 md:h-auto overflow-hidden order-1 md:order-2">
            <!-- Using public/Landing page2.jpg as requested with fallback -->
            <img src="public/Landing page2.jpg" 
                 onerror="this.src='https://images.unsplash.com/photo-1628864076295-a275215c1e0a?q=80&w=1470&auto=format&fit=crop'"
                 alt="RUMA Action" 
                 class="split-image transition-transform duration-700 hover:scale-105">
            <div class="absolute inset-0 bg-gradient-to-t from-ruma-black/80 to-transparent md:hidden"></div>
        </div>
    </section>

    <!-- Stats & Visualization -->
    <section id="stats" class="py-24 bg-ruma-dark relative overflow-hidden">
        <!-- Decoration -->
        <div class="absolute top-0 right-0 w-96 h-96 bg-ruma-red/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <!-- Introduction Block -->
            <div class="text-center mb-16">
                <span class="text-ruma-red font-bold tracking-widest text-sm uppercase block mb-2" data-i18n="stats_label">Our Impact</span>
                <h2 class="font-display text-4xl md:text-5xl font-bold uppercase text-white" data-i18n="chart_title">Performance Metrics</h2>
                <p class="text-gray-400 max-w-2xl mx-auto mt-4" data-i18n="chart_desc">
                    Analyzing our team's aggregate capabilities across key competitive dimensions and historical data.
                </p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                <!-- Counters Grid -->
                <div class="grid grid-cols-2 gap-6">
                    <div class="bg-ruma-black p-8 border-t-4 border-ruma-red hover:translate-y-[-5px] transition-transform duration-300">
                        <div class="text-4xl md:text-6xl font-display font-bold text-white mb-2 counter" data-target="50">0</div>
                        <div class="text-xs uppercase tracking-widest text-ruma-textGray" data-i18n="stat_members">Members</div>
                    </div>
                    <div class="bg-ruma-black p-8 border-t-4 border-white hover:translate-y-[-5px] transition-transform duration-300">
                        <div class="text-4xl md:text-6xl font-display font-bold text-white mb-2 counter" data-target="3">0</div>
                        <div class="text-xs uppercase tracking-widest text-ruma-textGray" data-i18n="stat_years">Years Exp</div>
                    </div>
                    <div class="bg-ruma-black p-8 border-t-4 border-white hover:translate-y-[-5px] transition-transform duration-300">
                        <div class="text-4xl md:text-6xl font-display font-bold text-white mb-2 counter" data-target="100">0</div>
                        <div class="text-xs uppercase tracking-widest text-ruma-textGray" data-i18n="stat_trainings">Sessions</div>
                    </div>
                    <div class="bg-ruma-black p-8 border-t-4 border-ruma-red hover:translate-y-[-5px] transition-transform duration-300">
                        <div class="text-4xl md:text-6xl font-display font-bold text-white mb-2 counter" data-target="10">0</div>
                        <div class="text-xs uppercase tracking-widest text-ruma-textGray" data-i18n="stat_races">Races</div>
                    </div>
                </div>

                <!-- Radar Chart -->
                <div class="bg-ruma-black/50 p-6 rounded-lg border border-gray-800 backdrop-blur-sm">
                    <div class="chart-container">
                        <canvas id="teamChart"></canvas>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- History / Achievements -->
    <section id="history" class="py-24 bg-ruma-black border-t border-gray-900">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 class="font-display text-4xl md:text-5xl font-bold uppercase text-white mb-16 text-center">
                History of <span class="text-ruma-red">Glory</span>
            </h2>

            <div class="relative border-l-2 border-gray-800 ml-4 md:ml-auto md:mr-auto md:w-2/3 space-y-16 pl-8 md:pl-12">
                <!-- Achievement 1 -->
                <div class="relative group">
                    <span class="absolute -left-[41px] md:-left-[57px] top-1 h-5 w-5 rounded-full bg-ruma-red border-4 border-ruma-black group-hover:scale-125 transition-transform"></span>
                    <span class="text-ruma-red font-bold text-sm tracking-wider block mb-1">NOV 2025</span>
                    <h3 class="text-2xl font-display font-bold text-white mb-2" data-i18n="award_1_title">2025 International Dragon Boat Race</h3>
                    <div class="inline-block bg-white text-ruma-black text-xs font-bold px-3 py-1 uppercase mb-3 skew-x-[-12deg]">
                        <span class="skew-x-[12deg] block" data-i18n="rank_3">3rd Place</span>
                    </div>
                    <p class="text-ruma-textGray text-sm max-w-lg">2000m Grand Final Mixed Large Boat. A testament to our endurance and strategic pacing in choppy waters.</p>
                </div>

                <!-- Achievement 2 -->
                <div class="relative group">
                    <span class="absolute -left-[41px] md:-left-[57px] top-1 h-5 w-5 rounded-full bg-gray-700 border-4 border-ruma-black group-hover:bg-white transition-colors"></span>
                    <span class="text-gray-500 font-bold text-sm tracking-wider block mb-1">JUN 2024</span>
                    <h3 class="text-2xl font-display font-bold text-white mb-2" data-i18n="award_2_title">2024 New Taipei City Speaker Cup</h3>
                    <div class="inline-block bg-gray-800 text-gray-300 text-xs font-bold px-3 py-1 uppercase mb-3 skew-x-[-12deg]">
                        <span class="skew-x-[12deg] block" data-i18n="rank_7">7th Place</span>
                    </div>
                    <p class="text-ruma-textGray text-sm max-w-lg">Large Boat Open Category. Our first major competition appearance establishing our presence in the league.</p>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer id="contact" class="bg-ruma-dark border-t border-gray-900 py-20">
        <div class="max-w-7xl mx-auto px-4 text-center">
            <h2 class="font-display text-4xl text-white uppercase mb-8" data-i18n="join_title">Ready to Join?</h2>
            
            <a href="https://instagram.com" target="_blank" class="inline-flex items-center gap-3 text-gray-400 hover:text-ruma-red transition-colors mb-12 group">
                <i class="fab fa-instagram text-3xl group-hover:scale-110 transition-transform"></i>
                <span class="font-bold tracking-widest text-lg">@ruma_dragonboat</span>
            </a>

            <div class="w-24 h-1 bg-ruma-red mx-auto mb-8"></div>

            <p class="text-gray-600 text-xs tracking-wider">
                &copy; 2026 RUMA Dragon Boat Team. <br>
                <span data-i18n="footer_rights">All Rights Reserved.</span>
            </p>
        </div>
    </footer>

    <!-- JavaScript Application Logic -->
    <script>
        /**
         * RUMA SPA Core Logic
         * Handles Bilingual System (i18n), Chart Visualization, and Interactivity.
         */

        // --- 1. Translation Dictionary (The Data Source) ---
        const dictionary = {
            en: {
                nav_home: "Home",
                nav_about: "About Us",
                nav_articles: "Articles",
                nav_videos: "Videos",
                nav_contact: "Contact",
                btn_join: "Join Us",
                hero_title_1: "RUMA",
                hero_title_2: "Dragon Boat",
                hero_subtitle: "No You, No Me, Only \"US\"",
                cta_primary: "Start Journey",
                about_label: "About Us",
                about_headline: "RUMA Core Values",
                about_desc: "RUMA is not just a team; it is a collective spirit. We forge champions through discipline, unity, and the relentless pursuit of speed. Founded in 2024, we represent the next evolution of dragon boat racing.",
                btn_learn: "Learn More",
                why_headline: "Why Choose RUMA?",
                feat_1_title: "Professional Training",
                feat_1_desc: "Systemized coaching focusing on biomechanics, strength conditioning, and paddling technique optimization.",
                feat_2_title: "Team Spirit",
                feat_2_desc: "More than a team. We are a family that pushes limits together. Cohesion is our greatest weapon on water.",
                feat_3_title: "Challenge Self",
                feat_3_desc: "Break your personal records. Compete in international regattas. Discover a stronger version of yourself.",
                stats_label: "Our Impact",
                stat_members: "Members",
                stat_years: "Years Exp",
                stat_trainings: "Sessions",
                stat_races: "Races",
                chart_title: "Performance Metrics",
                chart_desc: "Analyzing our team's aggregate capabilities across key competitive dimensions.",
                chart_labels: ["Power", "Endurance", "Technique", "Sync", "Mental", "Speed"],
                award_1_title: "2025 International Dragon Boat Race",
                rank_3: "3rd Place",
                award_2_title: "2024 New Taipei City Speaker Cup",
                rank_7: "7th Place",
                join_title: "Ready to Join?",
                footer_rights: "All Rights Reserved."
            },
            zh: {
                nav_home: "首頁",
                nav_about: "關於我們",
                nav_articles: "文章",
                nav_videos: "影片",
                nav_contact: "聯絡我們",
                btn_join: "加入我們",
                hero_title_1: "RUMA",
                hero_title_2: "龍舟隊",
                hero_subtitle: "沒有你，我，只有「我們」",
                cta_primary: "開始旅程",
                about_label: "關於我們",
                about_headline: "RUMA 核心價值",
                about_desc: "RUMA 不僅是一支隊伍，更是一種集體精神。我們透過紀律、團結和對速度的執著來鍛造冠軍。成立於 2024 年，我們代表著龍舟競技的進化。",
                btn_learn: "了解更多",
                why_headline: "為什麼選擇 RUMA？",
                feat_1_title: "專業訓練",
                feat_1_desc: "系統化的教練指導，專注於生物力學、體能調節與划槳技術優化。",
                feat_2_title: "團隊精神",
                feat_2_desc: "不只是隊伍，更是家人。凝聚力是我們在水上最強大的武器。",
                feat_3_title: "挑戰自我",
                feat_3_desc: "突破個人紀錄，參與國際賽事，發現更強大的自己。",
                stats_label: "數據指標",
                stat_members: "隊員",
                stat_years: "年經歷",
                stat_trainings: "次訓練",
                stat_races: "場比賽",
                chart_title: "團隊能力指標",
                chart_desc: "分析我們團隊在關鍵競爭維度上的綜合能力。",
                chart_labels: ["力量", "耐力", "技術", "默契", "心智", "速度"],
                award_1_title: "2025 國際龍舟錦標賽",
                rank_3: "第三名",
                award_2_title: "2024 新北市議長盃龍舟賽",
                rank_7: "第七名",
                join_title: "準備好加入了嗎？",
                footer_rights: "版權所有。"
            }
        };

        // --- 2. State Management ---
        const appState = {
            lang: 'en',
            chart: null,
            hasAnimatedCounters: false
        };

        // --- 3. Core Functions ---

        function initApp() {
            detectLanguage();
            updateDOM();
            setupEventListeners();
            initChart();
            setupIntersectionObservers();
        }

        // --- i18n System ---
        function detectLanguage() {
            // 1. Check Persistence
            const saved = localStorage.getItem('ruma_lang');
            if (saved) {
                appState.lang = saved;
                return;
            }
            // 2. Auto-Detect Device
            const browser = navigator.language || navigator.userLanguage;
            if (browser && (browser.toLowerCase().includes('zh') || browser.toLowerCase().includes('cn'))) {
                appState.lang = 'zh';
            } else {
                appState.lang = 'en';
            }
        }

        function toggleLanguage() {
            appState.lang = appState.lang === 'en' ? 'zh' : 'en';
            localStorage.setItem('ruma_lang', appState.lang); // Persistence
            updateDOM();
            updateChart();
        }

        function updateDOM() {
            // Text Replacement
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (dictionary[appState.lang][key]) {
                    el.textContent = dictionary[appState.lang][key];
                }
            });

            // UI State Updates
            const btnDesktop = document.getElementById('lang-toggle');
            const btnMobile = document.getElementById('lang-toggle-mobile');
            
            const label = appState.lang === 'en' ? "EN | 繁中" : "繁中 | EN";
            const mobileLabel = `Switch Language (${appState.lang === 'en' ? '中文' : 'English'})`;
            
            btnDesktop.textContent = label;
            btnMobile.textContent = mobileLabel;

            // Typography Tweaks for Chinese
            if (appState.lang === 'zh') {
                document.body.classList.remove('tracking-wide');
                document.body.classList.add('tracking-normal');
            } else {
                document.body.classList.add('tracking-wide');
                document.body.classList.remove('tracking-normal');
            }
        }

        // --- Chart Visualization ---
        function initChart() {
            const ctx = document.getElementById('teamChart').getContext('2d');
            
            const config = {
                type: 'radar',
                data: {
                    labels: dictionary[appState.lang].chart_labels,
                    datasets: [{
                        label: 'RUMA Stats',
                        data: [85, 90, 80, 95, 88, 92],
                        backgroundColor: 'rgba(217, 4, 41, 0.4)', // RUMA Red with opacity
                        borderColor: '#D90429',
                        pointBackgroundColor: '#fff',
                        pointBorderColor: '#D90429',
                        pointHoverBackgroundColor: '#D90429',
                        pointHoverBorderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            angleLines: { color: 'rgba(255,255,255,0.1)' },
                            grid: { color: 'rgba(255,255,255,0.1)' },
                            pointLabels: {
                                color: '#fff',
                                font: { family: 'Oswald', size: 14 }
                            },
                            ticks: { display: false, backdropColor: 'transparent' },
                            suggestedMin: 0,
                            suggestedMax: 100
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(0,0,0,0.9)',
                            titleFont: { family: 'Oswald' },
                            bodyFont: { family: 'Roboto' },
                            borderColor: '#333',
                            borderWidth: 1
                        }
                    }
                }
            };
            appState.chart = new Chart(ctx, config);
        }

        function updateChart() {
            if (appState.chart) {
                appState.chart.data.labels = dictionary[appState.lang].chart_labels;
                appState.chart.update();
            }
        }

        // --- Interactivity & Animation ---
        function setupEventListeners() {
            // Navbar Scroll Effect
            window.addEventListener('scroll', () => {
                const nav = document.getElementById('navbar');
                if (window.scrollY > 50) {
                    nav.classList.remove('nav-transparent');
                    nav.classList.add('nav-scrolled');
                } else {
                    nav.classList.add('nav-transparent');
                    nav.classList.remove('nav-scrolled');
                }
            });

            // Mobile Menu
            const menuBtn = document.getElementById('mobile-menu-btn');
            const mobileMenu = document.getElementById('mobile-menu');
            menuBtn.addEventListener('click', () => {
                mobileMenu.classList.toggle('hidden');
            });

            // Language Toggles
            document.getElementById('lang-toggle').addEventListener('click', toggleLanguage);
            document.getElementById('lang-toggle-mobile').addEventListener('click', toggleLanguage);
        }

        function setupIntersectionObservers() {
            // Counter Animation
            const counters = document.querySelectorAll('.counter');
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !appState.hasAnimatedCounters) {
                        animateCounter(entry.target);
                    }
                });
            }, { threshold: 0.5 });

            counters.forEach(c => observer.observe(c));
        }

        function animateCounter(el) {
            const target = +el.getAttribute('data-target');
            const duration = 2000; // 2 seconds
            const step = Math.ceil(target / (duration / 16)); 
            
            let current = 0;
            const timer = setInterval(() => {
                current += step;
                if (current >= target) {
                    el.textContent = target + "+";
                    clearInterval(timer);
                } else {
                    el.textContent = current;
                }
            }, 16);
        }

        // --- Initialization ---
        document.addEventListener('DOMContentLoaded', initApp);

    </script>
</body>
</html>