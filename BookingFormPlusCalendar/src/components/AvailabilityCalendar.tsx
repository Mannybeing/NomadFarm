import React from "react";
import "./AvailabilityCalendar.css";
import { AvailabilityPayload, TimeSlot } from "../types";

interface AvailabilityCalendarProps {
    availability: AvailabilityPayload;
    selectedSlot: TimeSlot | null;
    onSlotSelect: (slot: TimeSlot) => void;
}

const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = ({
    availability,
    selectedSlot,
    onSlotSelect
}) => {
    console.log("[AvailabilityCalendar] Rendered with:", { availability, selectedSlot });

    // Helper to check if a slot is within allowed hours in Mexico City time
    const isSlotAllowed = (slot: TimeSlot): boolean => {
        const MX_TZ = "America/Mexico_City";
        const startDate = new Date(slot.start);
        const endDate = new Date(slot.end);
        // Get day of week in Mexico City time
        const dayOfWeek = new Date(startDate.toLocaleString("en-US", { timeZone: MX_TZ })).getDay();
        const startHour = new Date(startDate.toLocaleString("en-US", { timeZone: MX_TZ })).getHours();
        const endHour = new Date(endDate.toLocaleString("en-US", { timeZone: MX_TZ })).getHours();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            // Weekend: 11-4 (11:00 to 16:59)
            return startHour >= 11 && endHour <= 17;
        } else {
            // Weekday: 9-5 (9:00 to 16:59)
            return startHour >= 9 && endHour <= 17;
        }
    };

    // Debug specific day
    const oct10 = availability.days.find(d => d.date === '2025-10-10');
    if (oct10) {
        console.log("[AvailabilityCalendar] Oct 10 data:", oct10);
        console.log("[AvailabilityCalendar] Oct 10 slots count:", oct10.slots.length);
    }

    const isSlotSelected = (slot: TimeSlot): boolean => {
        return selectedSlot !== null &&
            selectedSlot.start === slot.start &&
            selectedSlot.end === slot.end;
    };

    const formatTimeSlot = (slot: TimeSlot): string => {
        // Convert UTC times to user's local timezone for display
        const startDate = new Date(slot.start);
        const endDate = new Date(slot.end);

        // Get user's local timezone
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const start = startDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: userTimezone // Display in user's local time
        });
        const end = endDate.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: userTimezone // Display in user's local time
        });
        return `${start} - ${end}`;
    }; const formatDayDate = (dateStr: string): string => {
        // Parse date without timezone shifting by treating it as local date
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day); // Month is 0-indexed
        return date.toLocaleDateString([], {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    const handleSlotClick = (slot: TimeSlot) => {
        console.log("[AvailabilityCalendar] Slot clicked:", slot);
        onSlotSelect(slot);
    };

    return (
        <div className="availability-calendar">
            {availability.days.map((day) => {
                const filteredSlots = day.slots.filter(isSlotAllowed);
                return (
                    <div key={day.date} className="day-column">
                        <div className="day-header">
                            {formatDayDate(day.date)}
                        </div>
                        <div className="day-slots">
                            {/* Debug logging for October 10th specifically */}
                            {day.date === '2025-10-10' && (() => {
                                console.log('[DEBUG] Oct 10 slots check:', {
                                    slots: day.slots,
                                    length: day.slots.length,
                                    condition: day.slots.length > 0,
                                    isArray: Array.isArray(day.slots)
                                });
                                return null;
                            })()}
                            {filteredSlots.length > 0 ? (
                                filteredSlots.map((slot, index) => (
                                    <button
                                        key={`${day.date}-${index}`}
                                        type="button"
                                        className={`time-slot-button ${isSlotSelected(slot) ? 'selected' : ''}`}
                                        onClick={() => handleSlotClick(slot)}
                                        aria-label={`Book slot ${formatTimeSlot(slot)} on ${formatDayDate(day.date)}`}
                                    >
                                        {formatTimeSlot(slot)}
                                    </button>
                                ))
                            ) : (
                                <div className="no-availability">
                                    No availability
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default React.memo(AvailabilityCalendar);
