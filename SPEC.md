# PredictED - AI-Powered Academic Dashboard

## 1. Project Overview

**Project Name:** PredictED
**Project Type:** Full-stack web application (college mini-project)
**Core Functionality:** AI-powered academic dashboard for attendance analytics, productivity tracking, and student academic management
**Target Users:** College students

---

## 2. UI/UX Specification

### Layout Structure

**Page Sections:**
- **Login Page:** Centered card with USN input, logo, branding
- **Dashboard Layout:**
  - Sidebar (280px fixed width, collapsible on mobile)
  - Main content area (fluid width)
  - Top header bar (64px height)
  - Content grid (responsive cards)

**Grid/Flex Layout:**
- CSS Grid for dashboard widgets
- Flexbox for component layouts
- Gap: 24px between cards
- Card border-radius: 16px

**Responsive Breakpoints:**
- Mobile: < 768px (sidebar collapses to hamburger menu)
- Tablet: 768px - 1024px (sidebar overlays)
- Desktop: > 1024px (full sidebar visible)

### Visual Design

**Color Palette (Dark Mode):**
- Background Primary: `#0a0a0f` (near black with slight blue)
- Background Secondary: `#12121a` (card backgrounds)
- Background Tertiary: `#1a1a24` (hover states)
- Accent Primary: `#6366f1` (indigo - primary actions)
- Accent Secondary: `#8b5cf6` (violet - secondary elements)
- Accent Gradient: `linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)`
- Success: `#10b981` (emerald)
- Warning: `#f59e0b` (amber)
- Danger: `#ef4444` (red)
- Text Primary: `#f8fafc` (white-ish)
- Text Secondary: `#94a3b8` (muted gray)
- Text Tertiary: `#64748b` (dimmer gray)
- Border: `#1e1e2e` (subtle borders)
- Glass: `rgba(255, 255, 255, 0.03)` (glassmorphism)

**Typography:**
- Font Family: `"Inter", -apple-system, BlinkMacSystemFont, sans-serif`
- Headings:
  - H1: 32px, font-weight: 700
  - H2: 24px, font-weight: 600
  - H3: 18px, font-weight: 600
- Body: 14px, font-weight: 400
- Small: 12px, font-weight: 400
- Line height: 1.5

**Spacing System:**
- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 20, 24, 32, 48, 64
- Card padding: 24px
- Section gap: 32px

**Visual Effects:**
- Card shadows: `0 4px 24px rgba(0, 0, 0, 0.4)`
- Glassmorphism: `backdrop-filter: blur(12px)`
- Border: `1px solid rgba(255, 255, 255, 0.05)`
- Hover transitions: 200ms ease-out
- Glow effects on hover: `box-shadow: 0 0 30px rgba(99, 102, 241, 0.2)`

### Components

**Login Components:**
- Logo with gradient text
- USN input field with icon
- Login button with gradient background
- Error message display
- Subtle background pattern

**Dashboard Components:**
1. **Sidebar:**
   - Logo at top
   - Navigation items with icons
   - Active state indicator
   - User profile section at bottom
   - Collapse button

2. **Header:**
   - Page title
   - Search bar
   - Notification bell with badge
   - AI chat toggle button

3. **Stats Cards (4 across on desktop):**
   - Overall attendance percentage
   - Classes attended
   - Classes missed
   - Risk level indicator
   - Animated counters
   - Trend indicators

4. **Attendance Table:**
   - Subject name
   - Total classes
   - Attended
   - Missed
   - Percentage with color coding
   - Bunk prediction

5. **Charts:**
   - Line chart: Attendance trend over time
   - Bar chart: Subject-wise attendance
   - Pie chart: Time distribution

6. **Widgets:**
   - Upcoming classes (next 3)
   - Assignments due (next 5)
   - Risk alerts
   - Notifications panel

7. **Timetable Section:**
   - Weekly view grid
   - Time slots
   - Subject cards with room info

8. **AI Chatbot:**
   - Floating chat button
   - Chat modal with messages
   - Input field
   - Typing indicator

**Component States:**
- Default: Base colors
- Hover: Elevated shadow, slight scale (1.02)
- Active: Accent border, glow
- Disabled: 50% opacity
- Loading: Skeleton pulse animation

**Animations (Framer Motion):**
- Page transitions: fade + slide (300ms)
- Card entrance: staggered fade-up
- Hover: scale + shadow (200ms)
- Modal: fade + scale (250ms)
- Counter: spring animation
- Charts: draw animation

---

## 3. Functionality Specification

### Core Features

**1. Authentication:**
- Hardcoded USN login (6 USNs)
- Password: any
- Session storage for login state
- Logout functionality

**2. Dashboard:**
- Real-time stats calculation
- Animated statistics
- Quick action buttons
- Personalized greeting

**3. Attendance Tracker:**
- Subject-wise breakdown
- Color-coded percentages:
  - Green (>75%)
  - Amber (60-75%)
  - Red (<60%)
- Filter by date range
- Sort by percentage

**4. Bunk Predictor:**
- Input: Target attendance percentage (default 75%)
- Output: Classes that can be missed
- Warning system:
  - Safe (can miss)
  - Warning (borderline)
  - Critical (cannot miss)
- Formula: `(attended - (target * total / 100))`

**5. Timetable:**
- Weekly schedule display
- Current class highlight
- Room/lab information
- Faculty name display

**6. Assignment Tracker:**
- Due date countdown
- Priority indicators
- Mark as complete
- Filter by subject/due date

**7. Notifications:**
- Unread count badge
- Mark as read
- Delete notifications
- Types: reminder, alert, info

**8. Analytics Charts:**
- Attendance trend (30 days)
- Subject comparison
- Weekly summary
- Interactive tooltips

**9. AI Chatbot:**
- Powered by Ollama + Llama 3
- Context-aware responses
- Study planning
- Attendance advice
- Productivity tips
- Typing indicators
- Message history

### API Endpoints (Flask)

```
GET  /api/login - Authenticate USN
GET  /api/student/<usn> - Get student data
GET  /api/attendance/<usn> - Get attendance records
GET  /api/subjects - Get all subjects
GET  /api/timetable/<usn> - Get timetable
GET  /api/assignments/<usn> - Get assignments
GET  /api/notifications/<usn> - Get notifications
POST /api/predict - Calculate bunk prediction
POST /api/chat - AI chatbot endpoint
PUT  /api/assignments/<id> - Update assignment status
PUT  /api/notifications/<id> - Mark notification read
```

### CSV Data Schema

**students.csv:**
```
usn,name,email,phone,semester,branch
```

**attendance.csv:**
```
usn,subject_id,date,status
```

**subjects.csv:**
```
id,name,code,faculty,room
```

**timetable.csv:**
```
day,time_slot,subject_code,room,faculty
```

**assignments.csv:**
```
id,usn,subject,title,due_date,priority,completed
```

**notifications.csv:**
```
id,usn,title,message,type,date,read
```

---

## 4. Acceptance Criteria

### Visual Checkpoints
- [ ] Login page displays centered card with gradient logo
- [ ] Dashboard has dark background (#0a0a0f)
- [ ] Cards have glassmorphism effect
- [ ] Sidebar shows navigation with icons
- [ ] Stats cards display animated counters
- [ ] Charts render with smooth animations
- [ ] Hover effects work on all interactive elements
- [ ] Responsive: works on mobile and desktop

### Functional Checkpoints
- [ ] Login accepts valid USNs only
- [ ] Dashboard loads student data correctly
- [ ] Attendance percentages calculate correctly
- [ ] Bunk predictor shows accurate predictions
- [ ] Timetable displays weekly schedule
- [ ] Assignments show due dates and priorities
- [ ] Notifications display with unread count
- [ ] AI chatbot responds to messages
- [ ] Logout clears session and returns to login

### Performance
- [ ] Page load < 3 seconds
- [ ] Smooth 60fps animations
- [ ] No console errors
- [ ] Responsive at all breakpoints