export interface Submission {
    parameterId: number;
    tierId: number;
    platform: string;
    imageDataUrl: string;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: string;
    achievementLabel?: string;
    isUpdate?: boolean;
}

export const PLATFORMS = ['LeetCode', 'CodeChef', 'HackerRank', 'SkillRack'];

export const CODING_TIERS = [
    { id: 1, label: 'Tier 1', salary: 'UPTO 5 LPA', marks: 10, totalProblems: 50, leetcodeMin: 15 },
    { id: 2, label: 'Tier 2', salary: '5 - BELOW 10 LPA', marks: 20, totalProblems: 150, leetcodeMin: 50 },
    { id: 3, label: 'Tier 3', salary: '10 LPA AND ABOVE', marks: 30, totalProblems: 300, leetcodeMin: 100 },
] as const;

export const PARAMETERS = [
    { id: 1, key: 'coding', name: 'Coding Problems Solved', maxMarks: 30, color: '#1F2937', available: true, icon: 'code' },
    { id: 2, key: 'oss', name: 'Open Source Contribution', maxMarks: 20, color: '#1F2937', available: true, icon: 'git-merge' },
    { id: 3, key: 'comp', name: 'Competition Achievement', maxMarks: 30, color: '#1F2937', available: true, icon: 'award' },
    { id: 4, key: 'cert', name: 'Certificate Requirement', maxMarks: 30, color: '#1F2937', available: true, icon: 'file-text' },
    { id: 5, key: 'cp', name: 'CP Rating', maxMarks: 30, color: '#1F2937', available: true, icon: 'bar-chart' },
    { id: 6, key: 'proj', name: 'Project / Product Dev', maxMarks: 20, color: '#1F2937', available: true, icon: 'layers' },
    { id: 7, key: 'apti', name: 'Aptitude Checkpoint', maxMarks: 20, color: '#1F2937', available: true, icon: 'target' },
    { id: 8, key: 'skill', name: 'Weekly SkillRank Assessment', maxMarks: 15, color: '#1F2937', available: true, icon: 'trending-up' },
];

export const LPA_THRESHOLDS = [
    { id: 1, label: 'UPTO 5 LPA', minMarks: 50, maxMarks: 195, color: '#16A34A' },
    { id: 2, label: '5 - BELOW 10 LPA', minMarks: 80, maxMarks: 195, color: '#2563EB' },
    { id: 3, label: '10 LPA AND ABOVE', minMarks: 145, maxMarks: 195, color: '#7C3AED' },
] as const;

export interface GenericTier {
    id: 1 | 2 | 3;
    salary: string;
    requirement: string;
    achievements: { label: string; marks: number; timeframe?: string }[];
    platforms?: string[];
}

export const GENERIC_PARAM_DATA: Record<number, { tiers: GenericTier[] }> = {
    2: {
        tiers: [
            {
                id: 1, salary: 'UPTO 5 LPA', requirement: 'Minimum One', achievements: [
                    { label: 'One beginner issue solved (GitHub)', marks: 5 },
                    { label: 'GSSOC/GSoC registration + 1 PR attempt', marks: 5, timeframe: 'Feb to April' },
                    { label: 'Joined GitHub issues/discussions', marks: 5 }
                ]
            },
            {
                id: 2, salary: '5 - BELOW 10 LPA', requirement: 'Minimum One', achievements: [
                    { label: 'Github: 1–2 merged PRs (public repo)', marks: 5 },
                    { label: 'GSSOC/GSoC: Contributor badge', marks: 10, timeframe: 'Feb to April' },
                    { label: 'Contributor tag in any OSS community', marks: 10 }
                ]
            },
            {
                id: 3, salary: '10 LPA AND ABOVE', requirement: 'Minimum One', achievements: [
                    { label: 'Github: 3+ merged PRs (public repos)', marks: 10 },
                    { label: 'GSSOC/GSoC: Top Contributor / Gold Badge', marks: 20, timeframe: 'Feb to April' },
                    { label: 'Maintainer/co-maintainer of repo (50+ stars)', marks: 20 },
                    { label: 'OSS organization project completed', marks: 20 }
                ]
            }
        ]
    },
    3: {
        tiers: [
            {
                id: 1, salary: 'UPTO 5 LPA', requirement: 'Minimum One', achievements: [
                    { label: 'CodeVita Round 1 Participation', marks: 5, timeframe: 'October-December' },
                    { label: 'CodeChef Starters (Beginner Track)', marks: 10 },
                    { label: 'AtCoder Beginner Contest (ABC) [A-B]', marks: 10 },
                    { label: 'CSES Practice Milestones 1', marks: 10 },
                    { label: 'TopCoder SRM (Division 2) - Easy', marks: 5 }
                ]
            },
            {
                id: 2, salary: '5 - BELOW 10 LPA', requirement: 'Minimum One', achievements: [
                    { label: 'CodeVita Round 2 - Cleared', marks: 20, timeframe: 'October-December' },
                    { label: 'Internal hackathon Winner', marks: 10 },
                    { label: 'TechGig Practice Challenges', marks: 10 },
                    { label: 'AlgoUtsav - NIT clear Preliminary Round', marks: 20, timeframe: 'December' },
                    { label: 'AtCoder Beginner Contest (ABC) [A-D]', marks: 20 },
                    { label: 'Codeforces Educational Rounds', marks: 10 },
                    { label: 'HackerEarth Circuits - Top 40%', marks: 20 },
                    { label: 'CodeChef Long/Starters - Top 25%', marks: 20 },
                    { label: 'CSES Practice Milestones 1 & 2', marks: 20 },
                    { label: 'TopCoder SRM (Division 2) - Intermediate', marks: 10 }
                ]
            },
            {
                id: 3, salary: '10 LPA AND ABOVE', requirement: 'Minimum One', achievements: [
                    { label: 'ICPC Regional Finalist (College Level Topper)', marks: 30 },
                    { label: 'Code Gladiators finalist', marks: 20, timeframe: 'June – September' },
                    { label: 'AlgoUtsav - NIT Finalist', marks: 30, timeframe: 'December' },
                    { label: 'Codeforces Global Rank (Top 20% or better)', marks: 30 },
                    { label: 'AtCoder Regular Contest — High Rank', marks: 30 },
                    { label: 'HackerEarth Circuits — Top 20%', marks: 30 },
                    { label: 'LeetCode Weekly Top 5%', marks: 30 },
                    { label: 'CodeChef Long/Starters Contest — Top 10%', marks: 30 },
                    { label: 'CSES Practice Milestones [1-3]', marks: 30 },
                    { label: 'TopCoder SRM (Division 1)', marks: 30 }
                ]
            }
        ]
    },
    4: {
        tiers: [
            {
                id: 1, salary: 'UPTO 5 LPA', requirement: 'Minimum Two', achievements: [
                    { label: 'NPTEL - Elite [Fundamental Algorithms, DBMS, C++]', marks: 5 },
                    { label: 'NPTEL - Silver [Fundamental Algorithms, DBMS, C++]', marks: 10 },
                    { label: 'NPTEL - Gold [Fundamental Algorithms, DBMS, C++]', marks: 20 },
                    { label: 'Wipro Future Skill Certificate', marks: 10 },
                    { label: 'Any one international Certificate', marks: 10 }
                ]
            },
            {
                id: 2, salary: '5 - BELOW 10 LPA', requirement: 'Minimum Two', achievements: [
                    { label: 'NPTEL 8 week - Elite [DBMS, C++]', marks: 5 },
                    { label: 'NPTEL 8 week - Silver [DBMS, C++]', marks: 10 },
                    { label: 'NPTEL 8 week - Gold [DBMS, C++]', marks: 20 },
                    { label: 'Wipro Future Skill Certificate', marks: 10 },
                    { label: 'Any one international Certificate', marks: 10 }
                ]
            },
            {
                id: 3, salary: '10 LPA AND ABOVE', requirement: 'Minimum Two', achievements: [
                    { label: 'NPTEL 12 week - Elite [Getting Started CP, Intro DB]', marks: 10 },
                    { label: 'NPTEL 12 week - Silver [Getting Started CP, Intro DB]', marks: 20 },
                    { label: 'NPTEL 12 week - Gold [Getting Started CP, Intro DB]', marks: 30 },
                    { label: 'NPTEL 8 week - Elite [DBMS, C++/Java, DSA using Java]', marks: 5 },
                    { label: 'NPTEL 8 week - Silver [DBMS, C++/Java, DSA using Java]', marks: 10 },
                    { label: 'NPTEL 8 week - Gold [DBMS, C++/Java, DSA using Java]', marks: 20 },
                    { label: 'Wipro Future Skill Certificate', marks: 10 },
                    { label: 'Any one international Certificate', marks: 10 }
                ]
            }
        ]
    },
    5: {
        tiers: [
            {
                id: 1, salary: 'UPTO 5 LPA', requirement: 'Minimum One', achievements: [
                    { label: 'CodeChef: 1star / 2star', marks: 10 },
                    { label: 'CodeForces: Newbie (800–999)', marks: 10 },
                    { label: 'AtCoder: Grey (0–399)', marks: 10 }
                ], platforms: ['CodeChef', 'Codeforces', 'AtCoder']
            },
            {
                id: 2, salary: '5 - BELOW 10 LPA', requirement: 'Minimum One', achievements: [
                    { label: 'CodeChef: 2star / 3 star', marks: 20 },
                    { label: 'CodeForces: Newbie→Pupil (1000–1199)', marks: 20 },
                    { label: 'AtCoder: Grey→Brown (400–799)', marks: 20 }
                ], platforms: ['CodeChef', 'Codeforces', 'AtCoder']
            },
            {
                id: 3, salary: '10 LPA AND ABOVE', requirement: 'Minimum One', achievements: [
                    { label: 'CodeChef: 3star +', marks: 30 },
                    { label: 'CodeForces: Pupil/Specialist (1200–1400+)', marks: 30 },
                    { label: 'AtCoder: Green (800–1199)', marks: 30 }
                ], platforms: ['CodeChef', 'Codeforces', 'AtCoder']
            }
        ]
    },
    6: {
        tiers: [
            {
                id: 1, salary: 'UPTO 5 LPA', requirement: 'Minimum One', achievements: [
                    { label: 'SIH participation', marks: 5 },
                    { label: 'Kaggle beginner notebook', marks: 5 },
                    { label: 'Open-source mini-project with at least 10+ GitHub stars', marks: 5 },
                    { label: 'HackWithInfy participant (Feb–May)', marks: 5 },
                    { label: 'GRiD participant (May–Aug)', marks: 5 },
                    { label: 'Hackathons by Fortune 500 Companies Participation', marks: 5 },
                    { label: 'Naan Mudhalvan / EDII / TNWISE Hackathon Participation', marks: 5 },
                    { label: 'InnovaTN / PSB / FinTech Challenge Participation', marks: 5 },
                    { label: 'Google Cloud Arcade (Qwiklabs Challenges)', marks: 10 },
                    { label: 'GDSC Solution Challenge (Entry Round)', marks: 10 }
                ]
            },
            {
                id: 2, salary: '5 - BELOW 10 LPA', requirement: 'Minimum One', achievements: [
                    { label: 'SIH finalist', marks: 10 },
                    { label: 'Devfolio hackathon shortlist (Top 10)', marks: 10 },
                    { label: 'Kaggle Bronze / Top 40%', marks: 10 },
                    { label: 'College project Expo Top 10', marks: 10 },
                    { label: 'Open-source mini-project with at least 20+ GitHub stars', marks: 10 },
                    { label: 'HackWithInfy shortlist (Feb–May)', marks: 10 },
                    { label: 'GRiD shortlist (June)', marks: 10 },
                    { label: 'Amazon ML Summer School selected (July)', marks: 10 },
                    { label: 'Hackathons by Fortune 500 Companies - Finalist', marks: 10 },
                    { label: 'Naan Mudhalvan / EDII / TNWISE Hackathon Finalist', marks: 10 },
                    { label: 'InnovaTN / PSB / FinTech Challenge Finalist', marks: 10 }
                ]
            },
            {
                id: 3, salary: '10 LPA AND ABOVE', requirement: 'Minimum One', achievements: [
                    { label: 'SIH Winner', marks: 20 },
                    { label: 'Kaggle Silver (Top 10–20%)', marks: 20 },
                    { label: 'Devfolio national finalist (Sep–Oct)', marks: 20 },
                    { label: 'Industry Project Excellence colab', marks: 20 },
                    { label: 'Facebook Hacker Cup Round 2 (October)', marks: 20 },
                    { label: 'Reply Code Challenge — Global ranking (March)', marks: 20 },
                    { label: 'MLH Hackathon Prizes', marks: 20 },
                    { label: 'Research Internship (IIT/IISC/NIT/DRDO/PSU)', marks: 20 },
                    { label: 'Hackathons by Fortune 500 Companies - Winner', marks: 20 },
                    { label: 'Naan Mudhalvan / EDII / TNWISE Hackathon Winner', marks: 20 },
                    { label: 'InnovaTN / PSB / FinTech Challenge Winner', marks: 20 }
                ]
            }
        ]
    },
    7: {
        tiers: [
            {
                id: 1, salary: 'UPTO 5 LPA', requirement: 'Minimum One', achievements: [
                    { label: 'TCS NQT Cleared', marks: 5 },
                    { label: 'Internal aptitude test pass (Skillrack)', marks: 5 },
                    { label: 'Infosys SpringBoard Skill Assessments', marks: 5 },
                    { label: 'Naukri FAST Cleared', marks: 5 },
                    { label: 'Unstop Aptitude Challenges Cleared', marks: 5 }
                ]
            },
            {
                id: 2, salary: '5 - BELOW 10 LPA', requirement: 'Minimum One', achievements: [
                    { label: 'TCS NQT Cognitive ≥ 75%', marks: 10 },
                    { label: 'Internal aptitude test ≥ 75%', marks: 10 },
                    { label: 'Infosys SpringBoard Skill Assessments ≥ 75%', marks: 10 },
                    { label: 'Naukri FAST ≥ 75%', marks: 10 },
                    { label: 'Unstop Aptitude Challenges ≥ 75%', marks: 10 }
                ]
            },
            {
                id: 3, salary: '10 LPA AND ABOVE', requirement: 'Minimum One', achievements: [
                    { label: 'HackerRank Problem Solving (Gold)', marks: 20 },
                    { label: 'TCS NQT Cognitive ≥ 85%', marks: 20 },
                    { label: 'Internal aptitude test ≥ 85%', marks: 20 },
                    { label: 'Infosys SpringBoard Skill Assessments ≥ 85%', marks: 20 },
                    { label: 'Naukri FAST ≥ 85%', marks: 20 },
                    { label: 'Unstop Aptitude Challenges ≥ 85%', marks: 20 }
                ]
            }
        ]
    },
    8: {
        tiers: [
            {
                id: 1, salary: 'UPTO 5 LPA', requirement: 'Average score is above 70 marks', achievements: [
                    { label: 'Average score is above 70 marks', marks: 5 }
                ]
            },
            {
                id: 2, salary: '5 - BELOW 10 LPA', requirement: 'Average score is above 75 marks', achievements: [
                    { label: 'Average score is above 75 marks', marks: 10 }
                ]
            },
            {
                id: 3, salary: '10 LPA AND ABOVE', requirement: 'Average score is above 80 marks', achievements: [
                    { label: 'Average score is above 80 marks', marks: 15 }
                ]
            }
        ]
    }
};

export function getParamData(parameterId: number) {
    return GENERIC_PARAM_DATA[parameterId];
}

export function getSubmissions(email: string): Submission[] {
    const key = `pp_subs_${email}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
}

export function saveSubmissions(email: string, subs: Submission[]) {
    const key = `pp_subs_${email}`;
    localStorage.setItem(key, JSON.stringify(subs));
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Role & Auth Data Mock (Local Storage Database)
// ─────────────────────────────────────────────────────────────────────────────

export type Role = 'student' | 'staff' | 'admin' | 'superadmin';

export interface User {
    email: string;
    role: Role;
    name: string;
    password?: string;
    regNo?: string;
    department?: string; // e.g. 'CSE'
    section?: string;    // e.g. 'A'
    year?: string;
    profilePic?: string; // Base64 image data URL
}

const DEFAULT_USERS: User[] = [
    { email: 'superadmin@gmail.com', password: '123', role: 'superadmin', name: 'Nithish (Super Admin)' },
    { email: 'admin@gmail.com', password: '123', role: 'admin', name: 'Dr. Admin (CSE HOD)', department: 'CSE' },
    { email: 'staff@gmail.com', password: '123', role: 'staff', name: 'Mr. Staff (Advisor)', department: 'CSE', section: 'A' },
    { email: 'nithishss48@gmail.com', password: '123', role: 'student', name: 'Nithish S S', department: 'CSE', section: 'A', year: '3', regNo: 'REG12345' }
];

export function getUsers(): User[] {
    const data = localStorage.getItem('pp_users');
    if (!data) {
        localStorage.setItem('pp_users', JSON.stringify(DEFAULT_USERS));
        return DEFAULT_USERS;
    }
    return JSON.parse(data);
}

export function saveUser(user: User): boolean {
    const users = getUsers();
    if (users.find(u => u.email === user.email)) return false; // Email exists
    users.push(user);
    localStorage.setItem('pp_users', JSON.stringify(users));
    return true;
}

export function getAllSubmissions(): { email: string; subs: Submission[] }[] {
    const users = getUsers().filter(u => u.role === 'student');
    return users.map(u => ({
        email: u.email,
        subs: getSubmissions(u.email)
    }));
}
