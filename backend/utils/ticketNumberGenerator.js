/**
 * Ticket Number Generator
 * Generates unique ticket numbers in format: TKT-YYYYMMDD-XXXXX
 */

const Ticket = require('../models/Ticket');

/**
 * Generate a unique ticket number
 * Format: TKT-YYYYMMDD-XXXXX
 * @returns {Promise<String>} - Unique ticket number
 */
const generateTicketNumber = async () => {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
  
  const prefix = `TKT-${dateStr}-`;
  
  // Find the highest sequence number for today
  const todayTickets = await Ticket.find({
    ticketNumber: { $regex: `^${prefix}` }
  }).sort({ ticketNumber: -1 }).limit(1);
  
  let sequence = 1;
  
  if (todayTickets.length > 0) {
    // Extract sequence number from last ticket
    const lastTicketNumber = todayTickets[0].ticketNumber;
    const lastSequence = parseInt(lastTicketNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }
  
  // Format sequence as 5-digit number
  const sequenceStr = sequence.toString().padStart(5, '0');
  const ticketNumber = `${prefix}${sequenceStr}`;
  
  // Double-check uniqueness (race condition protection)
  const existingTicket = await Ticket.findOne({ ticketNumber });
  if (existingTicket) {
    // If collision, try next sequence
    return generateTicketNumber();
  }
  
  return ticketNumber;
};

module.exports = {
  generateTicketNumber
};

