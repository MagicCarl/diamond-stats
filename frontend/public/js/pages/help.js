// Diamond Stats - Help / Instructions Page

export class HelpPage {
    constructor(app) {
        this.app = app;
    }

    async render(container) {
        container.innerHTML = `
            <nav class="nav-bar">
                <a href="#/dashboard" class="logo">Diamond<span>Stats</span></a>
                <div class="nav-links">
                    <a href="#/dashboard" class="nav-link">Dashboard</a>
                    <a href="#/teams" class="nav-link">Teams</a>
                    <a href="#/help" class="nav-link active">Help</a>
                </div>
            </nav>
            <div class="page" style="max-width:800px;">
                <div class="page-header">
                    <h1 class="page-title">How to Use Diamond Stats</h1>
                </div>

                <div class="help-section card mb-lg" style="padding:var(--space-lg);">
                    <h2 style="margin-bottom:var(--space-md); color:var(--accent);">Getting Started</h2>
                    <div class="help-steps">
                        <div class="help-step">
                            <span class="help-step-num">1</span>
                            <div>
                                <strong>Create a Team</strong>
                                <p>Go to <strong>Dashboard</strong> and tap <strong>+ New Team</strong>. Enter your team name, choose baseball or softball, select the level, and set the number of innings per game.</p>
                            </div>
                        </div>
                        <div class="help-step">
                            <span class="help-step-num">2</span>
                            <div>
                                <strong>Add Players</strong>
                                <p>Tap on your team card to open the roster. Tap <strong>+ Add Player</strong> and enter each player's name, jersey number, position, and batting/throwing hand.</p>
                            </div>
                        </div>
                        <div class="help-step">
                            <span class="help-step-num">3</span>
                            <div>
                                <strong>Schedule a Game</strong>
                                <p>From the roster page, tap <strong>+ New Game</strong>. Enter the opponent name, date, location, and whether you are the home or away team.</p>
                            </div>
                        </div>
                        <div class="help-step">
                            <span class="help-step-num">4</span>
                            <div>
                                <strong>Set Your Lineup</strong>
                                <p>Open the game and tap <strong>Set Lineup</strong>. Select a player for each batting order slot. Their primary position auto-fills. You can reorder by changing the dropdown selections.</p>
                            </div>
                        </div>
                        <div class="help-step">
                            <span class="help-step-num">5</span>
                            <div>
                                <strong>Start the Game</strong>
                                <p>Once your lineup is set, tap <strong>Start Game</strong>. The live scoring screen will appear with the first batter ready.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section card mb-lg" style="padding:var(--space-lg);">
                    <h2 style="margin-bottom:var(--space-md); color:var(--accent);">Scoring At-Bats</h2>
                    <p style="margin-bottom:var(--space-md); color:var(--text-secondary);">The live scoring screen has three steps for each at-bat:</p>
                    <div class="help-steps">
                        <div class="help-step">
                            <span class="help-step-num">1</span>
                            <div>
                                <strong>Tap the Result</strong>
                                <p>Choose the at-bat result from the color-coded buttons:</p>
                                <ul style="margin:8px 0; padding-left:20px; color:var(--text-secondary);">
                                    <li><span style="color:var(--hit);">Green</span> = Hits (1B, 2B, 3B)</li>
                                    <li><span style="color:var(--hr);">Gold</span> = Home Run (HR)</li>
                                    <li><span style="color:var(--walk);">Blue</span> = Walks (BB, HBP, IBB)</li>
                                    <li><span style="color:var(--strikeout);">Red</span> = Strikeouts (K, KL)</li>
                                    <li><span style="color:var(--out);">Gray</span> = Outs (GO, FO, LO, PO, FC, DP)</li>
                                    <li><span style="color:var(--error-play);">Orange</span> = Reached on Error (E)</li>
                                </ul>
                                <p>The selected result will highlight. You can change it before confirming.</p>
                            </div>
                        </div>
                        <div class="help-step">
                            <span class="help-step-num">2</span>
                            <div>
                                <strong>Set Runs, RBI, and Scored</strong>
                                <p><strong>RUNS</strong> = total runs that scored on this play (including the batter if they scored).<br>
                                <strong>RBI</strong> = runs batted in credited to this batter (per official scoring rules).<br>
                                <strong>Scored</strong> = did this batter come around to score?</p>
                                <p style="color:var(--text-muted); font-size:var(--font-size-sm);">For a solo home run: Runs=1, RBI=1, Scored=YES. These auto-set when you tap HR.</p>
                            </div>
                        </div>
                        <div class="help-step">
                            <span class="help-step-num">3</span>
                            <div>
                                <strong>Tap Next</strong>
                                <p>Tap the green <strong>Next</strong> button to confirm and save. The lineup automatically advances to the next batter. Outs are tracked and the inning changes after 3 outs.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section card mb-lg" style="padding:var(--space-lg);">
                    <h2 style="margin-bottom:var(--space-md); color:var(--accent);">Other Controls</h2>
                    <div class="help-steps">
                        <div class="help-step">
                            <span class="help-step-num">?</span>
                            <div>
                                <strong>Undo</strong>
                                <p>Tap <strong>Undo</strong> to reverse the last at-bat. The score, outs, and inning are all restored.</p>
                            </div>
                        </div>
                        <div class="help-step">
                            <span class="help-step-num">?</span>
                            <div>
                                <strong>Change Batter</strong>
                                <p>Tap any name in the lineup sidebar to manually switch to that batter (e.g., for a pinch hitter).</p>
                            </div>
                        </div>
                        <div class="help-step">
                            <span class="help-step-num">?</span>
                            <div>
                                <strong>Opponent Runs</strong>
                                <p>Use the <strong>Opp +1</strong> / <strong>Opp -1</strong> buttons in the scoreboard area to track runs scored by the opposing team.</p>
                            </div>
                        </div>
                        <div class="help-step">
                            <span class="help-step-num">?</span>
                            <div>
                                <strong>End Game</strong>
                                <p>When the game is over, tap <strong>End Game</strong> to mark it as final. You can then view the full box score and stats.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section card mb-lg" style="padding:var(--space-lg);">
                    <h2 style="margin-bottom:var(--space-md); color:var(--accent);">Viewing Stats</h2>
                    <div class="help-steps">
                        <div class="help-step">
                            <span class="help-step-num">?</span>
                            <div>
                                <strong>Box Score</strong>
                                <p>After a game, tap <strong>Box</strong> to see the traditional box score with linescore, batting stats (AB, R, H, 2B, 3B, HR, RBI, BB, K), and pitching stats.</p>
                            </div>
                        </div>
                        <div class="help-step">
                            <span class="help-step-num">?</span>
                            <div>
                                <strong>Team Stats</strong>
                                <p>From the roster page, tap <strong>Stats</strong> to see season batting and pitching statistics. Tap any column header to sort. Stats include AVG, OBP, SLG, OPS, ERA, WHIP, K/9, and more.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="help-section card" style="padding:var(--space-lg);">
                    <h2 style="margin-bottom:var(--space-md); color:var(--accent);">Tips</h2>
                    <ul style="padding-left:20px; color:var(--text-secondary); line-height:1.8;">
                        <li>Works on iPad in landscape mode for the best scoring experience.</li>
                        <li>The app works offline. At-bats are saved and synced when you reconnect.</li>
                        <li>Softball games use 7-inning ERA calculation automatically.</li>
                        <li>Stats are calculated in real time from at-bat data - no manual entry needed.</li>
                        <li>The play-by-play log shows the most recent plays first.</li>
                    </ul>
                </div>
            </div>
        `;
    }

    destroy() {}
}
