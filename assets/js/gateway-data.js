/* Acubins University — public website content (demo data). */
window.UNI = {
  programs: [
    { id: 'meng', name: 'Mechanical Engineering', level: 'ug', college: 'eng', deg: 'BSc', years: 4, credits: 132, mode: 'Full-time', intake: 'Fall · Spring', careers: ['Energy & utilities', 'Automotive', 'Aerospace', 'Manufacturing'], blurb: 'Thermodynamics, design and robotics, with a capstone project built alongside industry partners.' },
    { id: 'cs', short: 'Computing', name: 'Computer Science', level: 'ug', college: 'cs', deg: 'BSc', years: 4, credits: 126, mode: 'Full-time', intake: 'Fall · Spring', careers: ['Software engineering', 'AI & data', 'Cybersecurity', 'Product'], blurb: 'Algorithms, systems and AI, with a year-long studio and internships across the UAE tech sector.' },
    { id: 'ai', name: 'Artificial Intelligence', level: 'ug', college: 'cs', deg: 'BSc', years: 4, credits: 128, mode: 'Full-time', intake: 'Fall', careers: ['ML engineering', 'Robotics', 'Research'], blurb: 'Machine learning, computer vision and language technology, with an ethics strand in every year.' },
    { id: 'civ', name: 'Civil & Environmental Engineering', level: 'ug', college: 'eng', deg: 'BSc', years: 4, credits: 134, mode: 'Full-time', intake: 'Fall', careers: ['Infrastructure', 'Sustainability', 'Consulting'], blurb: 'Smart cities, water and sustainable structures for a fast-growing region.' },
    { id: 'bba', name: 'Business Administration', level: 'ug', college: 'bus', deg: 'BBA', years: 4, credits: 120, mode: 'Full-time', intake: 'Fall · Spring', careers: ['Management', 'Finance', 'Marketing', 'Entrepreneurship'], blurb: 'Strategy, finance and entrepreneurship, with a start-up incubator open from year one.' },
    { id: 'fin', name: 'Finance & Fintech', level: 'ug', college: 'bus', deg: 'BSc', years: 4, credits: 122, mode: 'Full-time', intake: 'Fall', careers: ['Banking', 'Fintech', 'Investment'], blurb: 'Islamic and conventional finance, digital payments and data-driven investing.' },
    { id: 'med', short: 'Medicine', name: 'Medicine (MBBS)', level: 'ug', college: 'med', deg: 'MBBS', years: 6, credits: 240, mode: 'Full-time', intake: 'Fall', careers: ['Clinical practice', 'Research', 'Public health'], blurb: 'Early clinical exposure in partner hospitals and a simulation centre from year two.' },
    { id: 'nurs', name: 'Nursing', level: 'ug', college: 'med', deg: 'BSN', years: 4, credits: 130, mode: 'Full-time', intake: 'Fall', careers: ['Hospital nursing', 'Community health', 'Education'], blurb: 'Compassionate, evidence-based care with 1,000+ hours of clinical placement.' },
    { id: 'des', name: 'Design & Media', level: 'ug', college: 'arts', deg: 'BA', years: 4, credits: 120, mode: 'Full-time', intake: 'Fall', careers: ['UX & product design', 'Film', 'Advertising'], blurb: 'Studio-based design, film and interactive media, with a graduate show every spring.' },
    { id: 'psy', name: 'Psychology', level: 'ug', college: 'arts', deg: 'BSc', years: 4, credits: 120, mode: 'Full-time', intake: 'Fall · Spring', careers: ['Counselling', 'HR', 'Research', 'Education'], blurb: 'From cognition to clinical psychology, with a research lab placement in year three.' },
    { id: 'mba', name: 'Executive MBA', level: 'pg', college: 'bus', deg: 'MBA', years: 2, credits: 45, mode: 'Weekend', intake: 'Fall · Spring', careers: ['Leadership', 'Consulting'], blurb: 'Weekend format for working leaders, with a global residency.' },
    { id: 'msai', name: 'MSc Data Science & AI', level: 'pg', college: 'cs', deg: 'MSc', years: 1.5, credits: 36, mode: 'Full / part-time', intake: 'Fall', careers: ['Data science', 'ML research'], blurb: 'Applied machine learning with a funded industry project.' },
    { id: 'mph', name: 'Master of Public Health', level: 'pg', college: 'med', deg: 'MPH', years: 2, credits: 42, mode: 'Part-time', intake: 'Fall', careers: ['Health policy', 'Epidemiology'], blurb: 'Epidemiology and health policy for the Gulf region.' },
    { id: 'med-ed', name: 'MEd Inclusive Education', level: 'pg', college: 'arts', deg: 'MEd', years: 2, credits: 36, mode: 'Part-time', intake: 'Spring', careers: ['Special education', 'School leadership'], blurb: 'Teaching for every learner, including People of Determination.' },
    { id: 'phd', name: 'PhD in Engineering', level: 'phd', college: 'eng', deg: 'PhD', years: 4, credits: 60, mode: 'Full-time', intake: 'Rolling', careers: ['Academia', 'R&D'], blurb: 'Fully funded doctoral research in energy, materials and robotics.' }
  ],
  colleges: { eng: 'Engineering', cs: 'Computing & AI', bus: 'Business', med: 'Medicine & Health', arts: 'Arts & Social Sciences' },
  news: [
    { tag: 'Research', date: '2026-10-22', title: 'Solar desalination prototype cuts energy use by 38%', text: 'A team from the College of Engineering tested a low-energy membrane at the coastal research station.', hue: 200 },
    { tag: 'Students', date: '2026-10-18', title: 'Acubins wins the regional AI hackathon', text: 'Five computing students built an assistive reading tool in 48 hours.', hue: 15 },
    { tag: 'Campus', date: '2026-10-12', title: 'New Learning Commons opens 24/7', text: 'Quiet zones, group pods and accessible study rooms across three floors.', hue: 150 },
    { tag: 'Health', date: '2026-10-05', title: 'Medicine partners with three new teaching hospitals', text: 'More clinical placements from year two of the MBBS.', hue: 340 },
    { tag: 'Community', date: '2026-09-28', title: '1,200 volunteers join the beach clean-up', text: 'The biggest student volunteering day in the university’s history.', hue: 45 }
  ],
  events: [
    { d: '2026-11-04', time: '10:00', title: 'Open Day', place: 'Main Quad', type: 'Admissions' },
    { d: '2026-11-09', time: '18:30', title: 'Public lecture: AI and the future of work', place: 'Grand Auditorium', type: 'Lecture' },
    { d: '2026-11-13', time: '16:00', title: 'Career Fair 2026', place: 'Sports Hall', type: 'Careers' },
    { d: '2026-11-20', time: '19:00', title: 'International Food Festival', place: 'Student Plaza', type: 'Community' },
    { d: '2026-12-02', time: '09:00', title: 'UAE National Day celebration', place: 'Whole campus', type: 'Culture' },
    { d: '2026-12-14', time: '08:00', title: 'Final exams begin', place: 'Exam halls', type: 'Academic' }
  ],
  calendar: [
    ['Aug 24', 'Fall semester begins'], ['Oct 13–17', 'Mid-term week'], ['Dec 2–3', 'National Day holiday'], ['Dec 14–24', 'Final exams'], ['Jan 12', 'Spring semester begins'], ['Mar', 'Spring break'], ['May 4–14', 'Final exams'], ['Jun 6', 'Commencement']
  ],
  services: [
    { id: 'library', icon: 'book', name: 'Library', sub: 'Search 1.2M titles, book a room' },
    { id: 'timetable', icon: 'calendar', name: 'My timetable', sub: 'Classes, rooms and changes' },
    { id: 'shuttle', icon: 'compass', name: 'Campus shuttle', sub: 'Live departures' },
    { id: 'dining', icon: 'cup', name: 'Dining today', sub: 'Menus and opening hours' },
    { id: 'gpa', icon: 'calc', name: 'GPA calculator', sub: 'Plan your grades' },
    { id: 'health', icon: 'stetho', name: 'Health & wellbeing', sub: 'Clinic, counselling, 24/7 line' },
    { id: 'careers', icon: 'rocket', name: 'Careers', sub: 'Jobs, internships, CV help' },
    { id: 'it', icon: 'bolt', name: 'IT help desk', sub: 'Wi-Fi, accounts, software' },
    { id: 'access', icon: 'shield', name: 'Accessibility (SAS)', sub: 'Support, accommodations, ERLY' }
  ],
  life: [
    { icon: 'users', title: '180+ clubs', text: 'Robotics, debate, film, chess, Emirati heritage, e-sports and more.', hue: 15 },
    { icon: 'flame', title: 'Varsity sports', text: 'Football, basketball, padel, swimming and a 50 m pool.', hue: 200 },
    { icon: 'building', title: 'Housing', text: 'Modern residences on campus, with study lounges on every floor.', hue: 150 },
    { icon: 'globe', title: '90 nationalities', text: 'A truly global community, rooted in Emirati culture.', hue: 270 },
    { icon: 'sprout', title: 'Wellbeing', text: 'Counselling, a prayer centre, fitness classes and quiet spaces.', hue: 100 },
    { icon: 'star', title: 'Arts & culture', text: 'Theatre, galleries, music ensembles and an annual festival.', hue: 330 }
  ],
  voices: [
    { q: 'The labs are open late and professors know your name. I built my first robot in the second semester.', who: 'Omar K.', role: 'Mechanical Engineering, Year 3' },
    { q: 'SAS helped me get extra time and read-aloud tools. It changed how I feel about exams.', who: 'Layla N.', role: 'Psychology, Year 2' },
    { q: 'I came for the MBA weekend format and left with a co-founder and a funded start-up.', who: 'Fatima A.', role: 'Executive MBA alumna' },
    { q: 'The hospital placements start early. By year three I was confident on the wards.', who: 'Rahul S.', role: 'Medicine, Year 4' }
  ],
  buildings: [
    { id: 'lib', short: 'Library', name: 'Learning Commons & Library', x: 46, y: 40, w: 16, h: 14, info: 'Open 24/7 in term · 1,200 study seats · accessible rooms on every floor.' },
    { id: 'eng', short: 'Engineering', name: 'College of Engineering', x: 12, y: 18, w: 20, h: 16, info: 'Labs, maker space, wind tunnel and the robotics arena.' },
    { id: 'cs', name: 'Computing & AI Tower', x: 70, y: 14, w: 16, h: 20, info: 'GPU cluster, cyber range and the start-up incubator.' },
    { id: 'med', name: 'Medical Sciences', x: 72, y: 56, w: 18, h: 18, info: 'Simulation hospital, anatomy suite and research labs.' },
    { id: 'sas', short: 'Student Hub', name: 'Student Hub · SAS', x: 34, y: 62, w: 18, h: 12, info: 'Student Accessibility Services, counselling, careers and the help desk.' },
    { id: 'sport', short: 'Sports', name: 'Sports Complex', x: 8, y: 58, w: 20, h: 22, info: 'Pool, sports hall, padel courts and a fitness centre.' },
    { id: 'aud', short: 'Auditorium', name: 'Grand Auditorium', x: 46, y: 14, w: 14, h: 14, info: '1,500 seats for lectures, concerts and commencement.' }
  ]
};
