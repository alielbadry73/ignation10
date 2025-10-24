# Subject-Specific Databases

## Overview
Each subject (Mathematics, Physics, Chemistry) now has its own dedicated database table for tracking student activities and performance.

## Database Tables

### 1. **mathematics_data**
Tracks all Mathematics activities for each student.

**Fields:**
- `student_id` - Student user ID
- `activity_type` - Type of activity (flashcard, homework, quiz, exam)
- `topic` - Specific topic (e.g., "Algebra", "Calculus")
- `score` - Points earned
- `total_score` - Maximum possible points
- `accuracy` - Percentage accuracy
- `time_spent` - Time in minutes
- `flashcards_correct` - Number of correct flashcards
- `flashcards_wrong` - Number of wrong flashcards (incorrect + forgotten)
- `homework_completed` - Number of homework completed
- `quizzes_completed` - Number of quizzes completed
- `exams_completed` - Number of exams completed
- `created_at` - Timestamp

### 2. **physics_data**
Same structure as mathematics_data, for Physics subject.

### 3. **chemistry_data**
Same structure as mathematics_data, for Chemistry subject.

## API Endpoints

### Mathematics
```javascript
// Save mathematics activity
POST /api/mathematics/activity
Headers: { Authorization: 'Bearer JWT_TOKEN' }
Body: {
  activity_type: "flashcard",
  topic: "Algebra",
  score: 85,
  total_score: 100,
  accuracy: 85,
  time_spent: 15,
  flashcards_correct: 17,
  flashcards_wrong: 3
}

// Get student's mathematics data
GET /api/mathematics/student/:student_id
Headers: { Authorization: 'Bearer JWT_TOKEN' }
```

### Physics
```javascript
// Save physics activity
POST /api/physics/activity

// Get student's physics data
GET /api/physics/student/:student_id
```

### Chemistry
```javascript
// Save chemistry activity
POST /api/chemistry/activity

// Get student's chemistry data
GET /api/chemistry/student/:student_id
```

## Data Tracking Example

When a student completes flashcard practice:

```javascript
fetch('http://localhost:3000/api/mathematics/activity', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + authToken
  },
  body: JSON.stringify({
    activity_type: 'flashcard',
    topic: 'Algebra',
    score: 17,
    total_score: 20,
    accuracy: 85,
    time_spent: 12,
    flashcards_correct: 17,
    flashcards_wrong: 3
  })
});
```

## Benefits

### 1. **Subject Isolation**
- Each subject has its own data
- No mixing of data between subjects
- Easier to query and analyze

### 2. **Detailed Tracking**
- Flashcard performance (correct vs wrong)
- Homework completion
- Quiz scores
- Exam results
- Time spent per subject

### 3. **Parent Reports**
- Generate subject-specific reports
- Track progress over time
- Weekly/monthly summaries per subject

### 4. **Admin Analytics**
- View student performance by subject
- Identify weak areas
- Compare performance across subjects

## Integration with Flashcards

The flashcard system now saves data to the subject-specific database:
- After each practice session
- Records accuracy, time spent
- Tracks correct vs wrong answers
- Associates with specific topics

## Future Enhancements

- Add subject-specific leaderboards (if needed)
- Subject-specific achievements
- Topic mastery tracking
- Personalized recommendations per subject



























































