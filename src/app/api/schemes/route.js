import { pool } from '@/lib/db/db';

export const dynamic = 'force-dynamic';

const MOCK_SCHEMES = [
    {
        id: "pmkisan",
        icon: "💰",
        title: "PM-Kisan Samman Nidhi",
        description: "Provides income support of ₹6,000 per year to all landholding farmer families across India, disbursed in three equal installments.",
        category: "income",
        tags: ["Income Support", "Central"],
        deadline: "Ongoing",
        ministry: "Ministry of Agriculture & Farmers Welfare",
        eligibility: [
            "All landholding farmer families",
            "Must have cultivable land in their name",
            "Subject to existing exclusion criteria (e.g., income taxpayers excluded)"
        ],
        benefits: [
            "₹6,000 per year in 3 installments of ₹2,000 each",
            "Directly transferred to bank account (DBT)",
            "No intermediary involved"
        ],
        applyLink: "https://pmkisan.gov.in/",
    },
    {
        id: "fby",
        icon: "🛡️",
        title: "Pradhan Mantri Fasal Bima Yojana",
        description: "Comprehensive crop insurance scheme protecting farmers against unseasonal rains, natural calamities, drought, floods, and pest attacks.",
        category: "insurance",
        tags: ["Insurance", "Central"],
        deadline: "Jul 31, 2026",
        ministry: "Ministry of Agriculture & Farmers Welfare",
        eligibility: [
            "All farmers including sharecroppers and tenant farmers",
            "Must have crop sown notification from the state",
            "Both loanee and non-loanee farmers can enroll"
        ],
        benefits: [
            "Premium: 2% for Kharif, 1.5% for Rabi, 5% for horticulture & commercial crops",
            "Full insured amount on crop loss",
            "Coverage for prevented sowing & post-harvest losses up to 14 days"
        ],
        applyLink: "https://pmfby.gov.in/",
    },
    {
        id: "kcc",
        icon: "🏦",
        title: "Kisan Credit Card (KCC)",
        description: "Provides timely and adequate credit support to farmers for cultivation, purchase of inputs, and other farm needs at concessional interest rates.",
        category: "credit",
        tags: ["Credit", "Loans", "Central"],
        deadline: "Ongoing",
        ministry: "Ministry of Finance",
        eligibility: [
            "Owner-cultivators, tenant farmers, oral lessees",
            "Must have valid land documents or tenancy proof",
            "Self Help Groups (SHGs) and Joint Liability Groups (JLGs)"
        ],
        benefits: [
            "Credit limit based on land holding and crop pattern",
            "Interest rate: 7% p.a. (effective 4% after interest subvention)",
            "Insurance cover for crop and personal accident",
            "Flexible repayment options post-harvest"
        ],
        applyLink: "https://www.pmkisan.gov.in/kcc",
    },
    {
        id: "pmkmy",
        icon: "🏗️",
        title: "PM Krishi Sinchai Yojana",
        description: "Ensures access to protective irrigation for every farm (Har Khet Ko Paani) and improves water use efficiency through micro-irrigation.",
        category: "subsidy",
        tags: ["Irrigation", "Subsidy", "Central"],
        deadline: "Mar 31, 2026",
        ministry: "Ministry of Agriculture & Farmers Welfare",
        eligibility: [
            "All categories of farmers with own or leased land",
            "Farmers in water-stressed blocks get priority",
            "Available for both individual and community projects"
        ],
        benefits: [
            "Up to 55% subsidy for micro-irrigation (drip/sprinkler)",
            "Additional subsidy for small and marginal farmers",
            "Support for water harvesting structures and watershed development"
        ],
        applyLink: "https://pmksy.gov.in/",
    },
    {
        id: "smy",
        icon: "🌱",
        title: "Soil Health Card Scheme",
        description: "Every farmer gets a Soil Health Card (SHC) every 2 years with crop-wise nutrient recommendations to improve soil quality and yields.",
        category: "subsidy",
        tags: ["Soil Health", "Central"],
        deadline: "Ongoing",
        ministry: "Ministry of Agriculture & Farmers Welfare",
        eligibility: [
            "All farmers across India",
            "No land size restriction",
            "Both owner and tenant farmers"
        ],
        benefits: [
            "Free soil testing and health card issuance",
            "Crop-wise fertilizer recommendation for optimal yield",
            "Reduces input cost by avoiding excess fertilizer use"
        ],
        applyLink: "https://soilhealth.dac.gov.in/",
    },
    {
        id: "nmsa",
        icon: "🌾",
        title: "National Mission for Sustainable Agriculture",
        description: "Promotes sustainable farming practices, organic farming, and climate-resilient agriculture to ensure food security.",
        category: "subsidy",
        tags: ["Organic", "Subsidy", "Central"],
        deadline: "Ongoing",
        ministry: "Ministry of Agriculture & Farmers Welfare",
        eligibility: [
            "All farmers willing to adopt sustainable practices",
            "Farmer groups and cooperatives for cluster approach",
            "Priority for rain-fed and vulnerable regions"
        ],
        benefits: [
            "₹50,000/ha assistance for organic farming clusters",
            "Training and capacity building support",
            "Subsidy on organic inputs and bio-fertilizers"
        ],
        applyLink: "https://nmsa.dac.gov.in/",
    },
    {
        id: "mikusy",
        icon: "🏭",
        title: "Mukhyamantri Krishi Udyog Yojana",
        description: "State-level subsidy scheme for setting up agro-based industries, food processing units, and purchase of modern farm equipment.",
        category: "state",
        tags: ["Subsidy", "State", "Equipment"],
        deadline: "Dec 31, 2026",
        ministry: "State Agriculture Department",
        eligibility: [
            "Domicile of the respective state",
            "Farmer or agri-entrepreneur with a viable project plan",
            "Must have suitable land/space for the project"
        ],
        benefits: [
            "25-50% capital subsidy on machinery and equipment",
            "Up to ₹10 lakh for small food processing units",
            "Interest subvention on term loans from banks"
        ],
        applyLink: "#",
    },
    {
        id: "rytha",
        icon: "🌻",
        title: "Rythu Bandhu (Telangana)",
        description: "Investment support of ₹10,000 per acre per year to all landholding farmers of Telangana state for purchasing farm inputs.",
        category: "state",
        tags: ["Income Support", "State"],
        deadline: "Ongoing",
        ministry: "Telangana Agriculture Department",
        eligibility: [
            "All farmer landholders of Telangana",
            "Land must be recorded in the revenue records (Pahani)",
            "No income or land size ceiling"
        ],
        benefits: [
            "₹10,000 per acre per year (₹5,000 each for Kharif and Rabi)",
            "Farmers free to choose their own inputs",
            "No loan recovery deductions"
        ],
        applyLink: "https://rythubandhu.telangana.gov.in/",
    }
];

export async function GET(request) {
    try {
        let dbSchemes = [];
        try {
            const res = await pool.query('SELECT * FROM "SCHEME" ORDER BY created_at DESC');
            dbSchemes = res.rows.map(row => ({
                id: row.id,
                icon: "🌾",
                title: row.title,
                description: row.description || '',
                category: row.category || 'general',
                tags: [row.category || 'Scheme', row.crop || 'General'].filter(Boolean),
                deadline: row.deadline ? new Date(row.deadline).toISOString().split('T')[0] : 'Ongoing',
                ministry: 'Agriculture Department',
                eligibility: ['Registered farmers in ' + (row.district || 'district')],
                benefits: ['Government agricultural scheme support'],
                applyLink: '#'
            }));
        } catch (e) {
            console.warn('[Schemes API] Database query fallback:', e.message);
        }

        const combinedSchemes = dbSchemes.length > 0 ? dbSchemes : MOCK_SCHEMES;
        const fetchedAt = new Date().toISOString();

        return new Response(JSON.stringify({
            schemes: combinedSchemes,
            fetchedAt
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=300',
                'X-Cached-At': fetchedAt
            }
        });
    } catch (error) {
        return Response.json({ error: error.message || 'Failed to fetch schemes' }, { status: 500 });
    }
}
