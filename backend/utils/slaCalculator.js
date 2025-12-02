/**
 * SLA Calculator Utility
 * Calculates SLA deadlines based on business hours (Monday-Friday, 9 AM - 6 PM IST)
 */

/**
 * Calculate SLA deadline (24 business hours from creation time)
 * @param {Date} createdAt - Ticket creation date
 * @returns {Date} - SLA deadline date
 */
const calculateSLADeadline = (createdAt) => {
  const startDate = new Date(createdAt);
  const businessHoursPerDay = 9; // 9 AM to 6 PM = 9 hours
  const totalBusinessHours = 24;
  const businessDaysNeeded = Math.ceil(totalBusinessHours / businessHoursPerDay);
  
  let currentDate = new Date(startDate);
  let businessHoursAdded = 0;
  
  // Start from the next business hour if created outside business hours
  const hour = currentDate.getHours();
  const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
  
  // If created on weekend, move to next Monday 9 AM
  if (dayOfWeek === 0) { // Sunday
    const daysToAdd = 1;
    currentDate.setDate(currentDate.getDate() + daysToAdd);
    currentDate.setHours(9, 0, 0, 0);
  } else if (dayOfWeek === 6) { // Saturday
    const daysToAdd = 2;
    currentDate.setDate(currentDate.getDate() + daysToAdd);
    currentDate.setHours(9, 0, 0, 0);
  } else {
    // If created before 9 AM, start from 9 AM
    if (hour < 9) {
      currentDate.setHours(9, 0, 0, 0);
    }
    // If created after 6 PM, move to next day 9 AM
    else if (hour >= 18) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(9, 0, 0, 0);
      // Skip weekends
      if (currentDate.getDay() === 0) { // Sunday
        currentDate.setDate(currentDate.getDate() + 1);
      } else if (currentDate.getDay() === 6) { // Saturday
        currentDate.setDate(currentDate.getDate() + 2);
      }
    }
  }
  
  // Add business hours
  while (businessHoursAdded < totalBusinessHours) {
    const dayOfWeek = currentDate.getDay();
    
    // Skip weekends
    if (dayOfWeek === 0) { // Sunday
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(9, 0, 0, 0);
      continue;
    } else if (dayOfWeek === 6) { // Saturday
      currentDate.setDate(currentDate.getDate() + 2);
      currentDate.setHours(9, 0, 0, 0);
      continue;
    }
    
    const currentHour = currentDate.getHours();
    const hoursRemainingToday = 18 - currentHour; // 6 PM = 18:00
    const hoursToAdd = Math.min(hoursRemainingToday, totalBusinessHours - businessHoursAdded);
    
    currentDate.setHours(currentDate.getHours() + hoursToAdd);
    businessHoursAdded += hoursToAdd;
    
    // If we haven't reached the target, move to next day
    if (businessHoursAdded < totalBusinessHours) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(9, 0, 0, 0);
    }
  }
  
  return currentDate;
};

/**
 * Get SLA status based on deadline
 * @param {Date} slaDeadline - SLA deadline date
 * @returns {String} - 'on-time', 'warning', or 'overdue'
 */
const getSLAStatus = (slaDeadline) => {
  if (!slaDeadline) return 'unknown';
  
  const now = new Date();
  const hoursRemaining = (slaDeadline - now) / (1000 * 60 * 60);
  
  if (hoursRemaining < 0) return 'overdue';
  if (hoursRemaining <= 4) return 'warning';
  return 'on-time';
};

/**
 * Get hours remaining until SLA deadline
 * @param {Date} slaDeadline - SLA deadline date
 * @returns {Number} - Hours remaining (can be negative if overdue)
 */
const getHoursRemaining = (slaDeadline) => {
  if (!slaDeadline) return null;
  
  const now = new Date();
  const hoursRemaining = (slaDeadline - now) / (1000 * 60 * 60);
  
  return Math.round(hoursRemaining * 10) / 10; // Round to 1 decimal place
};

module.exports = {
  calculateSLADeadline,
  getSLAStatus,
  getHoursRemaining
};

