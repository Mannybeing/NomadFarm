# Booking Form Plus Calendar

This project is a React application that provides a booking form UI for users to apply and select available time slots. It includes components for managing user input, displaying availability, and submitting booking requests.

## Project Structure

```
BookingFormPlusCalendar
├── public
│   └── index.html          # The main HTML file for the application
├── src
│   ├── components
│   │   ├── NomadBooking.tsx # Component for the booking form
│   │   └── AvailabilityCalendar.tsx # Component for displaying available time slots
│   ├── types
│   │   └── index.ts        # TypeScript type definitions
│   ├── styles
│   │   ├── NomadBooking.css # Styles for the booking form
│   │   └── AvailabilityCalendar.css # Styles for the availability calendar
│   ├── App.tsx             # Main application component
│   ├── App.css             # Global styles for the application
│   ├── index.tsx           # Entry point of the React application
│   └── index.css           # Additional global styles
├── package.json             # npm configuration file
├── tsconfig.json            # TypeScript configuration file
└── README.md                # Project documentation
```

## Features

- **User Input Management**: The booking form captures user details such as name, email, WhatsApp, room interest, experience, and work schedule.
- **Availability Calendar**: Users can view available time slots in a calendar format and select their preferred time.
- **Validation**: The form includes validation to ensure all required fields are filled out before submission.
- **Success Message**: Upon successful booking, a confirmation message is displayed to the user.

## Getting Started

1. Clone the repository:
   ```
   git clone <repository-url>
   ```

2. Navigate to the project directory:
   ```
   cd BookingFormPlusCalendar
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Start the development server:
   ```
   npm start
   ```

5. Open your browser and go to `http://localhost:3000` to view the application.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License.