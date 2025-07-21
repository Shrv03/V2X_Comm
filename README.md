# Interactive V2X Emergency Braking Simulation

A web-based simulation to visualize V2X (Vehicle-to-Everything) communication and emergency braking using hybrid 5G C-V2X and Visible Light Communication (VLC) methods.

## Overview

This project demonstrates how vehicles communicate emergency braking messages in real-time to avoid collisions. When the lead vehicle brakes suddenly, following vehicles receive the warning via both 5G C-V2X and VLC (headlights/taillights), enabling quick, automated braking responses. The simulation allows users to:

- Control vehicle speeds and positions.
- Initiate emergency braking scenarios.
- Observe live message transfers and vehicle reactions.
- Switch between or combine communication methods (VLC & 5G).

## Features

- **Interactive control panel** to generate/send V2X messages.
- **Visualization** of message propagation (VLC and C-V2X/5G).
- **Real-time vehicle dynamics** (speed adjustment, braking).
- **Support for multiple scenarios:** e.g., emergency stops.
- **Weather and latency adjustments** *(expand, if implemented)*.

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, etc.)

### Running Locally

1. Clone this repository:
git clone https://github.com/Shrv03/V2X_Comm.git
cd V2X_Comm

2. Open `index.html` in your web browser.

*(If more advanced build or server instructions are needed, add them here.)*

## Usage

- Use the on-screen controls to set up your vehicles.
- Click to trigger an emergency brake scenario.
- Watch how messages are sent via both VLC and 5G, and how vehicles respond.

## File Structure

- `index.html` – main application shell
- `script.js` – core simulation logic
- `styles.css` – interface and visualization styling

## Technologies Used

- JavaScript
- HTML5 Canvas
- CSS3

## Planned Improvements

- Enhanced visualization of light-based and radio-based communication.
- Weather effects and transmission reliability.
- Additional message/control types.

## License

MIT License

## Author

Shravan Murlidharan | shravanm2k@gmail.com 

