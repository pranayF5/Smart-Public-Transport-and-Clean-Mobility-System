<<<<<<< HEAD
# Smart Public Transport and Clean Mobility System

A responsive full-stack student demo project for exploring sample public transport routes, planning a trip, comparing illustrative carbon emissions, and submitting feedback.

## Technology used
- **Frontend:** HTML5, CSS3, vanilla JavaScript
- **Backend:** Node.js built-in HTTP server and REST API
- **Storage:** JSON file for submitted feedback
- **Dependencies:** None (no `npm install` required)

## Requirements
- Node.js 18 or later
- A web browser
- VS Code (recommended, optional)

Check Node.js is installed by opening Command Prompt and running:

```cmd
node --version
npm --version
```

If `node` is not recognized, install Node.js LTS from https://nodejs.org/ and reopen Command Prompt.

## Run on Windows (CMD)
1. Extract the downloaded ZIP.
2. Open the extracted `Smart_Public_Transport_and_Clean_Mobility_System` folder.
3. Click the File Explorer address bar, type `cmd`, and press Enter. This opens CMD in the project folder.
4. Start the server:

```cmd
npm start
```

5. Open this URL in your browser: **http://localhost:3000**
6. Keep the CMD window open while demonstrating the website. Press `Ctrl+C` in CMD to stop the server.

You can also start it with `node server.js`.

## Features
- Responsive dashboard and clean-mobility landing page
- Sample metro, bus, electric bus, and cycle routes
- Search and transport-mode filters
- Trip planner API with indicative duration, fare, and estimated CO₂ comparison
- Feedback form saved to `data/feedback.json`
- Backend health endpoint and simple statistics endpoint

## API endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check that the backend is running |
| GET | `/api/routes` | List sample routes; optional `?mode=metro` and `?q=Miyapur` filters |
| GET | `/api/stats` | Return demo dashboard statistics |
| POST | `/api/plan` | Create a sample trip estimate from JSON `{ "from": "Miyapur", "to": "LB Nagar" }` |
| POST | `/api/feedback` | Save feedback JSON `{ "rating": 5, "message": "More cycle lanes" }` |

## Important demo limitations
- Routes, fares, waiting times, and emissions are **illustrative sample data**, not live public-transport information.
- The trip planner uses a simple demo matching rule, not a production route-optimization service or map API.
- Feedback is stored locally in a JSON file. This is suitable for a classroom demo, not production use or sensitive data.
- No external API keys or database setup are required.

## Project structure
```text
Smart_Public_Transport_and_Clean_Mobility_System/
├── server.js              # Node.js backend and REST API
├── package.json           # Project metadata and run command
├── README.md              # Setup and demo instructions
├── .gitignore
├── data/
│   └── feedback.json      # Locally stored demo feedback
└── public/
    ├── index.html         # Frontend structure
    ├── styles.css         # Responsive styling
    └── app.js             # Frontend interactions and API calls
```

## Suggested classroom demo
1. Start the app using `npm start`.
2. Show the route cards and try searching for `Miyapur`.
3. Filter by Metro or Cycle.
4. Plan a trip, for example Miyapur to LB Nagar, and explain that the carbon numbers are illustrative estimates.
5. Submit a short feedback message.
6. Open `data/feedback.json` to show that feedback was saved.
7. Visit `http://localhost:3000/api/health` to show a backend response.
=======
# Smart-Public-Transport-and-Clean-Mobility-System
Smart Public Transport and Clean Mobility System using HTML, CSS, JavaScript and Node.js.
>>>>>>> 598391f443b74aa2af31b90aae501ceed44884af
