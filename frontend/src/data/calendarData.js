export const calendarData = [
  {
    week: "01",
    month: "MAR",
    days: { mon: "*2", tue: "*3", wed: "*4", thu: "*5", fri: "*6", sat: "7" },
    workingDays: "05",
    remarks: [
      "2nd to 6th - Course Registration (Mandatory for all students)",
      "AICTE Activity Point Registration",
      "Students Induction Program / Talent Day",
      "2nd - Commencement of classes",
      "7th - First Saturday Holiday"
    ]
  },
  {
    week: "02",
    month: "MAR",
    days: { mon: "9", tue: "10", wed: "11", thu: "12", fri: "13", sat: "14" },
    workingDays: "06",
    remarks: ["Regular classes week"]
  },
  {
    week: "03",
    month: "MAR",
    days: { mon: "16", tue: "17", wed: "18", thu: "19", fri: "20", sat: "21" },
    workingDays: "04",
    remarks: ["19th - Ugadi Holiday", "21st - Ramzan, Third Saturday Holiday"]
  },
  {
    week: "04",
    month: "MAR",
    days: { mon: "23", tue: "24", wed: "25", thu: "26", fri: "27", sat: "28" },
    workingDays: "06",
    remarks: ["28th - Proctor Meeting I", "IPBL Meeting", "Interdisciplinary Project Based Learning meeting with guides in respective branches"]
  },
  {
    week: "05",
    month: "MAR/APR",
    days: { mon: "30", tue: "31", wed: "1", thu: "2", fri: "3", sat: "4" },
    workingDays: "03",
    remarks: ["31st - Mahaveer Jayanthi Holiday", "3rd - Good Friday Holiday", "4th - First Saturday Holiday", "8th to 10th - Internal Assessment Test 1 (IAT-1)"]
  },
  {
    week: "06",
    month: "APR",
    days: { mon: "6", tue: "7", wed: "*8", thu: "*9", fri: "*10", sat: "11" },
    workingDays: "06",
    remarks: ["8th to 10th - Internal Assessment Test 1", "11th - Proctor Meeting II and IPBL meeting", "Project meeting with guides in respective branches", "Initiation of project", "Concept development and design"]
  },
  {
    week: "07",
    month: "APR",
    days: { mon: "13", tue: "14", wed: "15", thu: "16", fri: "17", sat: "18" },
    workingDays: "04",
    remarks: ["14th - Ambedkar Jayanthi Holiday", "16th - Display of IAT-I marks", "17th - Student feedback", "18th - Third Saturday Holiday"]
  },
  {
    week: "08",
    month: "APR",
    days: { mon: "20", tue: "21", wed: "22", thu: "23", fri: "24", sat: "25" },
    workingDays: "05",
    remarks: ["20th - Basava Jayanthi Holiday", "25th - Proctor Meeting II and IPBL meeting", "Project meeting with guides", "Initiation of project"]
  },
  {
    week: "09",
    month: "APR/MAY",
    days: { mon: "27", tue: "28", wed: "29", thu: "30", fri: "1", sat: "2" },
    workingDays: "04",
    remarks: ["1st - May Day Holiday", "2nd - First Saturday Holiday"]
  },
  {
    week: "10",
    month: "MAY",
    days: { mon: "4", tue: "5", wed: "6", thu: "7", fri: "8", sat: "9" },
    workingDays: "06",
    remarks: ["9th - Proctor Meeting III and IPBL meeting", "Project meeting with guides", "Prototype development"]
  },
  {
    week: "11",
    month: "MAY",
    days: { mon: "*11", tue: "*12", wed: "*13", thu: "14", fri: "15", sat: "16" },
    workingDays: "05",
    remarks: ["11th to 13th - Internal Assessment Test 2 (IAT-II)", "13th - Tentative one credit course Humanities ONLINE Test", "16th - Third Saturday Holiday"]
  },
  {
    week: "12",
    month: "MAY",
    days: { mon: "18", tue: "19", wed: "*20", thu: "21", fri: "22", sat: "23" },
    workingDays: "06",
    remarks: ["20th - Display of IAT-II Marks", "23rd - Tentative one credit course Humanities OFFLINE test", "Afternoon: Proctor Meeting III and IPBL meeting", "Testing & Validation", "Scintillating Idea Project Competition/Exhibition in Physics Lab"]
  },
  {
    week: "13",
    month: "MAY",
    days: { mon: "25", tue: "26", wed: "27", thu: "28", fri: "29", sat: "30" },
    workingDays: "05",
    remarks: ["28th - Bakrid Holiday", "Proctor Meeting IV and IPBL meeting", "Documentation & Presentation"]
  },
  {
    week: "14",
    month: "JUN",
    days: { mon: "***1", tue: "***2", wed: "***3", thu: "***4", fri: "***5", sat: "6" },
    workingDays: "05",
    remarks: ["1st to 5th - Laboratory Internal Assessment", "Interdisciplinary Project Based Learning Internal Evaluation", "Final Demo and Social Pitch", "CIE evaluation of mini project all batches", "Course End Survey", "6th - First Saturday Holiday"]
  },
  {
    week: "15",
    month: "JUN",
    days: { mon: "8", tue: "9", wed: "10", thu: "*11", fri: "*12", sat: "*13" },
    workingDays: "06",
    remarks: ["11th to 13th - Internal Assessment Test 3 (IAT-III)"]
  },
  {
    week: "16",
    month: "JUN",
    days: { mon: "15", tue: "16", wed: "*17", thu: "18", fri: "*19" },
    workingDays: "05",
    remarks: ["17th - Display of IAT-III Marks", "19th - Submission of CIE Marks and Attendance to COE Office", "Last Working Day"]
  }
];

export const footerData = {
  workingDays: {
    mon: 15,
    tue: 14,
    wed: 16,
    thu: 14,
    fri: 14,
    sat: 8,
    total: 81
  },
  notes: [
    "Extra classes could be scheduled in the timetable and individual lesson plan to compensate for minimum required working days.",
    "Dates may change subject to directives from Government/University/Compliance agencies or emergencies.",
    "In case of holidays, events will take place on the next working day or alternate announced date.",
    "June 22nd 2026 onwards - Semester End Examination (Tentative)"
  ],
  warning: "THE CALENDAR OF EVENTS IS SUBJECT TO MODIFICATIONS"
};

export const holidaysList = [
  "7",
  "21",
  "4",
  "31",
  "3",
  "14",
  "20",
  "1",
  "2",
  "28",
  "6",
  "16"
];

export const isHoliday = (dateStr) => {
  if (!dateStr) return false;

  const cleanDate = String(dateStr).replace(/\*/g, '');
  return holidaysList.includes(cleanDate);
};