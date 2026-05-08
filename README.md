# Foodle — The Daily Food Word Game

Foodle is a daily food-themed word game inspired by the spirit of Wordle. Every midnight, a new fresh dish or ingredient is selected — try to guess it in six tries!

## Project Overview

Foodle is a web-based word puzzle game where players guess food-related words. It features a clean, responsive design with multiple game modes and customization options.

### Key Features

- **Daily Puzzle**: A new word every day at midnight (local time), shared by all players.
- **Multiple Lengths**: Choose between 5, 6, or 7-letter word boards.
- **Game Modes**: 
  - **Daily**: One puzzle per day.
  - **Hourly**: A new puzzle every hour.
  - **Unlimited**: Play as many puzzles as you want.
- **Hints System**: Get a category, starting letter, or definition hint (costs one guess each).
- **Customization**: Multiple themes (Kitchen, Midnight, Citrus, etc.), font sets, and tile shapes.
- **Statistics**: Track your win percentage, current streak, and guess distribution.
- **Dark Mode**: Support for both light and dark themes.

## How to Play

1. Type any real food-related word of the required length and hit Enter.
2. The color of the tiles will change to show how close your guess was:
   - **Green**: The letter is in the word and in the correct spot.
   - **Yellow**: The letter is in the word but in the wrong spot.
   - **Gray**: The letter is not in the word at all.
3. Solve the puzzle in the allotted number of guesses to win!

## Technical Stack

- **HTML5 & CSS3**: Core structure and styling.
- **React 18**: Frontend library (loaded via CDN).
- **Babel Standalone**: In-browser JSX transpilation (loaded via CDN).
- **LocalStorage**: Client-side storage for game state and statistics.

## How to Run Locally

Since this project uses Babel Standalone to handle JSX directly in the browser, there is no build step or `npm install` required. You can run it using any local HTTP server.

### Option 1: VS Code Live Server (Recommended)
1. Open the project folder in VS Code.
2. Install the **Live Server** extension if you haven't already.
3. Click the **"Go Live"** button in the bottom right corner of the editor.

### Option 2: Python HTTP Server
If you have Python installed, run the following command in the project root:
```bash
# Python 3
python3 -m http.server 8000
```
Then open `http://localhost:8000` in your browser.

### Option 3: Node.js (npx)
If you have Node.js installed, you can use `npx`:
```bash
npx serve .
```
Then open the URL provided in the terminal.

---

*Enjoy the game! Visit [foodle](https://foodlegame.net) for the live version.*
