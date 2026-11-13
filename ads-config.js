// ============================================
// ONBOX - Ad Network Integration
// ============================================
// 
// INSTRUCTIONS: Choose ONE ad network below, uncomment the block,
// and paste your actual Publisher ID / Ad Code where indicated.
// Then include this file in index.html: <script src="ads-config.js"></script>
//
// RECOMMENDED AD NETWORKS FOR STREAMING SITES:
//
// 1. GOOGLE ADSENSE (Best long-term revenue, requires approval)
//    - Apply at: https://www.google.com/adsense/start
//    - Pros: Highest RPM, trusted brand, auto-ads
//    - Cons: Strict approval, can ban streaming sites
//    - Best for: Sites with original content + legal disclaimers
//
// 2. PROPELLERADS (Best for movie/streaming sites)
//    - Sign up: https://propellerads.com
//    - Pros: No approval needed, high CPM for entertainment
//    - Formats: Pop-under, push notifications, native banners, interstitials
//    - Best for: Streaming sites, instant monetization
//
// 3. ADSTERRA (Good alternative, fast approval)
//    - Sign up: https://adsterra.com
//    - Pros: Multiple formats, good for entertainment niche
//    - Formats: Banners, pop-unders, social bar, direct links
//    - Best for: Beginners, quick setup
//
// 4. MONETAG (Formerly PropellerAds direct, high CPM)
//    - Sign up: https://monetag.com
//    - Pros: Very high CPM for video/streaming traffic
//    - Cons: Aggressive ads (pop-ups)
//    - Best for: Maximum revenue from streaming traffic
//
// 5. ADMAVEN (Push + Pop, good for streaming)
//    - Sign up: https://ad-maven.com
//    - Pros: Good rates for movie traffic
//
// ============================================

const AdManager = {
    // ============================================
    // OPTION 1: GOOGLE ADSENSE
    // ============================================
    // Uncomment below and replace ca-pub-XXXXXXXXXXXXXXXX with your ID
    //
    // initAdSense() {
    //     // Auto-ads script
    //     const script = document.createElement('script');
    //     script.async = true;
    //     script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX';
    //     script.crossOrigin = 'anonymous';
    //     document.head.appendChild(script);
    //
    //     // Push auto-ads
    //     (window.adsbygoogle = window.adsbygoogle || []).push({});
    //
    //     // Insert banner ads into ad-banner containers
    //     document.querySelectorAll('.ad-banner').forEach((banner, index) => {
    //         banner.innerHTML = `
    //             <ins class="adsbygoogle"
    //                 style="display:block"
    //                 data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
    //                 data-ad-slot="YOUR_AD_SLOT_${index}"
    //                 data-ad-format="auto"
    //                 data-full-width-responsive="true"></ins>
    //         `;
    //         (window.adsbygoogle = window.adsbygoogle || []).push({});
    //     });
    // },

    // ============================================
    // OPTION 2: PROPELLERADS
    // ============================================
    // Uncomment below and replace YOUR_PROP_ID with your ID
    //
    // initPropellerAds() {
    //     // Main Propeller script
    //     const script = document.createElement('script');
    //     script.innerHTML = `(function(s,u,z,p){s.src=u,s.setAttribute('data-zone',z),p.appendChild(s);})(document.createElement('script'),'https://inklinkor.com/tag.min.js',YOUR_PROP_ID,document.body||document.documentElement)`;
    //     document.head.appendChild(script);
    //
    //     // Native banner ads for ad-banner containers
    //     document.querySelectorAll('.ad-banner').forEach((banner, index) => {
    //         banner.innerHTML = `
    //             <div id="propeller-banner-${index}" style="width:100%;min-height:90px;">
    //                 <!-- Propeller native banner code goes here -->
    //             </div>
    //         `;
    //     });
    // },

    // ============================================
    // OPTION 3: ADSTERRA
    // ============================================
    // Uncomment below and replace YOUR_ADSTERRA_KEY with your ID
    //
    // initAdsterra() {
    //     // Pop-under / social bar
    //     const script = document.createElement('script');
    //     script.type = 'text/javascript';
    //     script.src = '//plYOUR_ADSTERRA_KEY.highperformancegate.com/YOUR_ADSTERRA_KEY.js';
    //     document.head.appendChild(script);
    //
    //     // Banner ads for ad-banner containers
    //     document.querySelectorAll('.ad-banner').forEach((banner, index) => {
    //         banner.innerHTML = `
    //             <script type="text/javascript">
    //                 atOptions = {
    //                     'key' : 'YOUR_BANNER_KEY_${index}',
    //                     'format' : 'iframe',
    //                     'height' : 90,
    //                     'width' : 728,
    //                     'params' : {}
    //                 };
    //             </script>
    //             <script type="text/javascript" src="//www.highperformanceformat.com/YOUR_BANNER_KEY_${index}/invoke.js"></script>
    //         `;
    //     });
    // },

    // ============================================
    // OPTION 4: MONETAG (Highest CPM for streaming)
    // ============================================
    // Uncomment below and replace YOUR_MONETAG_ID with your ID
    //
    // initMonetag() {
    //     const script = document.createElement('script');
    //     script.src = 'https://alwingulla.com/88/tag.min.js';
    //     script.setAttribute('data-zone', 'YOUR_MONETAG_ID');
    //     script.async = true;
    //     document.head.appendChild(script);
    //
    //     // Banner placeholders
    //     document.querySelectorAll('.ad-banner').forEach((banner, index) => {
    //         banner.innerHTML = `
    //             <div id="monetag-banner-${index}" style="width:100%;min-height:90px;background:var(--bg-tertiary);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:12px;">
    //                 <!-- Paste Monetag banner code here -->
    //                 Ad Space ${index + 1}
    //             </div>
    //         `;
    //     });
    // },

    // ============================================
    // DEMO MODE (default) - Shows placeholder ads
    // Remove this when you enable a real network above
    // ============================================
    initDemo() {
        // Placeholder ads are already in HTML - no action needed
        console.log('AdManager: Running in demo mode. Enable a real network in ads-config.js');
    },

    // ============================================
    // INITIALIZE - Call ONE of the methods above
    // ============================================
    init() {
        // Pick ONE line below and uncomment it:
        // this.initAdSense();
        // this.initPropellerAds();
        // this.initAdsterra();
        // this.initMonetag();
        this.initDemo(); // Remove this when you enable real ads
    }
};

// Auto-init when script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AdManager.init());
} else {
    AdManager.init();
}

window.AdManager = AdManager;
