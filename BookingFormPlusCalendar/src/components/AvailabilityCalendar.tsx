import React, { useMemo } from "react";
import "./AvailabilityCalendar.css";
import { AvailabilityPayload, TimeSlot } from "../types";

// Diagnostic helper
const renderCount = { current: 0 };

function useRenderDiagnostics(props: any) {
    React.useEffect(() => {
        renderCount.current++;
        console.log(`[AvailabilityCalendar] Render #${renderCount.current}`, {
            availability: props.availability,
            selectedSlot: props.selectedSlot,
            onSlotSelect: props.onSlotSelect,
        });
    });
}

interface AvailabilityCalendarProps {
    availability: AvailabilityPayload;
    selectedSlot: TimeSlot | null;
    onSlotSelect: (slot: TimeSlot) => void;
}

const AvailabilityCalendar: React.FC<AvailabilityCalendarProps> = React.memo(
    (props) => {
        useRenderDiagnostics(props);
        const { availability, selectedSlot, onSlotSelect } = props;

        // --- Fix timezone interpretation ---
        const parseLocalDate = (dateStr: string): Date => {
            const parts = dateStr.split("-");
            return new Date(
                Number(parts[0]),
                Number(parts[1]) - 1,
                Number(parts[2])
            );
        };

        // --- Determine allowed slot ---
        const isSlotAllowed = React.useCallback((slot: TimeSlot): boolean => {
            const MX_TZ = "America/Mexico_City";
            const startDate = new Date(slot.start);
            const endDate = new Date(slot.end);

            const localStart = new Date(
                startDate.toLocaleString("en-US", { timeZone: MX_TZ })
            );
            const localEnd = new Date(
                endDate.toLocaleString("en-US", { timeZone: MX_TZ })
            );

            const dayOfWeek = localStart.getDay();
            const startHour = localStart.getHours();
            const endHour = localEnd.getHours();

            if (dayOfWeek === 0 || dayOfWeek === 6) {
                // Weekend: 11 AM – 5 PM
                return startHour >= 11 && endHour <= 17;
            } else {
                // Weekday: 9 AM – 5 PM
                return startHour >= 9 && endHour <= 17;
            }
        }, []);

        const isSlotSelected = (slot: TimeSlot): boolean =>
            selectedSlot !== null &&
            selectedSlot.start === slot.start &&
            selectedSlot.end === slot.end;

        const formatTimeSlot = React.useCallback((slot: TimeSlot): string => {
            const start = new Date(slot.start);
            const end = new Date(slot.end);
            return `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
        }, []);

        const formatDayDate = React.useCallback((dateStr: string): string => {
            const date = parseLocalDate(dateStr);
            const weekday = date.toLocaleDateString(undefined, {
                weekday: "long",
            });
            const formattedDate = date.toLocaleDateString(undefined, {
                month: "2-digit",
                day: "2-digit",
                year: "numeric",
            });
            return `${weekday}, ${formattedDate}`;
        }, []);

        const handleSlotClick = (slot: TimeSlot) => {
            onSlotSelect(slot);
        };

        // --- Filter slots by allowed times and apply 3-hour rule for today ---
        const filteredSlotsByDay = useMemo(() => {
            const now = new Date();
            const cutoff = new Date(now.getTime() + 3 * 60 * 60 * 1000);

            return availability.days.map((day) => {
                const dayDate = parseLocalDate(day.date);
                return {
                    date: day.date,
                    slots: day.slots.filter((slot) => {
                        const start = new Date(slot.start);
                        const isFutureDay = dayDate > now;
                        return isSlotAllowed(slot) && (isFutureDay || start >= cutoff);
                    }),
                };
            });
        }, [availability.days, isSlotAllowed]);

        // --- Filter out past days ---
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureDays = filteredSlotsByDay.filter((day) => {
            const localDay = parseLocalDate(day.date);
            return localDay >= today;
        });

        // --- Local timezone abbreviation ---
        const tzAbbrev = new Date()
            .toLocaleTimeString("en", { timeZoneName: "short" })
            .split(" ")
            .pop();

        return (
            <div className="availability-calendar">
                {futureDays.map((day) => (
                    <div key={day.date} className="day-column">
                        <div className="day-header">
                            {formatDayDate(day.date)}
                        </div>
                        <div className="day-slots">
                            {day.slots.length > 0 ? (
                                day.slots.map((slot, index) => (
                                    <button
                                        key={`${day.date}-${index}`}
                                        type="button"
                                        className={`time-slot-button ${isSlotSelected(slot) ? "selected" : ""
                                            }`}
                                        onClick={() => handleSlotClick(slot)}
                                        aria-label={`Book slot ${formatTimeSlot(
                                            slot
                                        )} on ${formatDayDate(day.date)}`}
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
                ))}
                <div className="timezone-footer">
                    Times in: {Intl.DateTimeFormat().resolvedOptions().timeZone} ({tzAbbrev})
                </div>
            </div>
        );
    }
);

export default React.memo(AvailabilityCalendar);
