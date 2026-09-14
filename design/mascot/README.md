# NightCall goose motion preview

Open index.html in a browser. The preview is independent of the live app.

The goose blinks every six seconds. Ask a question raises its wing once, then returns to idle. Blink and pause controls support manual review. The system reduced-motion preference suppresses all character animation. Answers only update the local preview.

Assets: approved-concept.png preserves the approved dark concept and crescent wordmark. goose-frames-v2.png is the corrected four-frame, two-by-two sprite sheet generated with the built-in image tool. goose-frames.png is the previous draft. Background is baked in for this dark-theme study. Frame changes are deliberately simple; this is a first motion study, not a final articulated animation rig.

Final image prompt: Surgical edit only to bottom two cells of the 2x2 sprite sheet. Remove the extra downward wing on the viewer-left belly in both bottom geese, including its inward black curved outline and pointed wingtip. Replace with a smooth continuous ivory torso. Exactly two wings: one raised on the left, one holding the mug on the right. Preserve top cells, positions, background, colors, head, scarf, feet, mug and raised poses. Same square canvas, no new elements or text.

For integration, bind the question animation to a newly presented unanswered question, not to timers or model activity. Idle blinking carries no implication of investigation progress. No sounds, repeated nudges, or success animation are included.
