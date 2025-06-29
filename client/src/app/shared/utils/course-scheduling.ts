import {CourseGroup} from '@/core/models/course-group.models';
import {getCurrentAcademicPeriod} from './academic-period';

/**
 * Determines if a course group is currently active based on day and time
 */
export function isCourseGroupCurrentlyActive(group: CourseGroup): boolean {
  const now = new Date();
  const currentDay = getDayName(now.getDay());
  const currentTime = formatTime(now);
  const currentAcademicPeriod = getCurrentAcademicPeriod();

  // Check if the group is in the current semester
  if (group.semester !== currentAcademicPeriod.semester) {
    return false;
  }

  // Check if today is the group's scheduled day
  if (group.day !== currentDay) {
    return false;
  }

  // Check if current time is within the group's time range
  return isTimeInRange(currentTime, group.from, group.to);
}

/**
 * Determines if a course group is upcoming (scheduled for later today or future days)
 */
export function isCourseGroupUpcoming(group: CourseGroup): boolean {
  const now = new Date();
  const currentDay = getDayName(now.getDay());
  const currentTime = formatTime(now);
  const currentAcademicPeriod = getCurrentAcademicPeriod();

  // Check if the group is in the current semester
  if (group.semester !== currentAcademicPeriod.semester) {
    return false;
  }

  // If it's the same day but hasn't started yet
  if (group.day === currentDay) {
    return currentTime < group.from;
  }

  // If it's a future day this week
  const currentDayIndex = now.getDay();
  const groupDayIndex = getDayIndex(group.day);

  // Check if the group day is later this week
  return groupDayIndex > currentDayIndex;
}

/**
 * Gets the next occurrence of a course group
 */
export function getNextCourseGroupOccurrence(group: CourseGroup): Date {
  const now = new Date();
  const currentDayIndex = now.getDay();
  const groupDayIndex = getDayIndex(group.day);

  const nextOccurrence = new Date(now);

  // Calculate days until next occurrence
  let daysUntilNext = groupDayIndex - currentDayIndex;
  if (daysUntilNext <= 0) {
    daysUntilNext += 7; // Next week
  }

  // If it's today but hasn't started yet, use today
  if (group.day === getDayName(now.getDay()) && formatTime(now) < group.from) {
    daysUntilNext = 0;
  }

  nextOccurrence.setDate(now.getDate() + daysUntilNext);

  // Set the time
  const [hours, minutes] = group.from.split(':').map(Number);
  nextOccurrence.setHours(hours, minutes, 0, 0);

  return nextOccurrence;
}

/**
 * Categorizes course groups as current, upcoming, or other
 */
export function categorizeCourseGroups(groups: CourseGroup[]): {
  current: CourseGroup[];
  upcoming: CourseGroup[];
  other: CourseGroup[];
} {
  const current: CourseGroup[] = [];
  const upcoming: CourseGroup[] = [];
  const other: CourseGroup[] = [];

  for (const group of groups) {
    if (isCourseGroupCurrentlyActive(group)) {
      current.push(group);
    } else if (isCourseGroupUpcoming(group)) {
      upcoming.push(group);
    } else {
      other.push(group);
    }
  }

  // Sort upcoming by next occurrence time
  upcoming.sort((a, b) => {
    const nextA = getNextCourseGroupOccurrence(a);
    const nextB = getNextCourseGroupOccurrence(b);
    return nextA.getTime() - nextB.getTime();
  });

  return { current, upcoming, other };
}

/**
 * Helper function to convert Date.getDay() to day name
 */
function getDayName(dayIndex: number): CourseGroup['day'] {
  const days: CourseGroup['day'][] = [
    'sunday', 'monday', 'tuesday', 'wednesday',
    'thursday', 'friday', 'saturday'
  ];
  return days[dayIndex];
}

/**
 * Helper function to convert day name to index
 */
function getDayIndex(dayName: CourseGroup['day']): number {
  const days: CourseGroup['day'][] = [
    'sunday', 'monday', 'tuesday', 'wednesday',
    'thursday', 'friday', 'saturday'
  ];
  return days.indexOf(dayName);
}

/**
 * Helper function to format time as HH:mm
 */
function formatTime(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

/**
 * Helper function to check if current time is within a time range
 */
function isTimeInRange(currentTime: string, startTime: string, endTime: string): boolean {
  return currentTime >= startTime && currentTime <= endTime;
}
