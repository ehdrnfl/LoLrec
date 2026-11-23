# LoLrec PRD

- GitHub: https://github.com/ehdrnfl/LoLrec
- Vercel: https://lolrec.vercel.app/

## 1. Project Overview and Target Users

LoLrec is a web service that connects to the live League of Legends champion selection screen and recommends champions based on the current picks and bans. It uses a model trained by our team and updates its recommendations as the draft changes.

The target users are LoL players deciding which champion to pick while considering both teams' compositions. Users can view recommendations without manually entering the draft into the website.

## 2. Primary Use Case and User Workflow

1. The user starts the LoL client and the local bridge, then opens the website.
2. When champion selection begins, the website automatically loads the current picks and bans.
3. The user checks both teams' draft and the model's champion recommendations.
4. Recommendations update when picks or bans change.
5. The user considers the recommendations and selects a champion directly in the game client.
6. When champion selection ends, the website returns to a waiting state.

## 3. Core Features and Functional Requirements

Essential features:

- Automatically retrieve picks and bans from the live champion selection screen.
- Display both teams' champions, bans, and the current draft phase.
- Recommend champions for the current situation using our team's trained model.
- Exclude champions that have already been picked or banned.
- Update recommendations when the draft changes.
- Show connection status and setup instructions if the client or bridge cannot be reached.

An optional feature is a filter that narrows recommendations by position or preferred champions.

## 4. AI Model's Role, Input, Output, and Expected Behavior

The model learns from historical match drafts to recommend champion candidates for the current situation.

| Item | Description |
| --- | --- |
| Input | Both teams' confirmed picks, banned champions, blue/red side, and the current draft phase |
| Output | A recommendation score for each candidate champion |
| Website behavior | Rank available candidates by score and display their names and recommendation ranks |
| Expected behavior | Recalculate recommendations using the updated situation when picks or bans change |

Recommendation scores are used for ranking and are not displayed as win probabilities. Until the model is connected, the recommendation area displays "Model integration pending."

## 5. Page Layout and UI Requirements

The page shows the draft and recommendations together.

- Header: Service description and client/bridge connection status.
- Main area: Both teams' champions, positions, and bans.
- Recommendation area: Recommended champion names and ranks, with a loading or waiting message when needed.

The two teams should be easy to distinguish. On narrow screens, the team panels stack vertically. If the connection is lost, the page shows a connection error instead of continuing to display outdated recommendations.

## 6. Technology Stack and System Architecture

The website uses Next.js, TypeScript, and Tailwind CSS and is deployed on Vercel. A local bridge built with Python and FastAPI reads the live champion selection session through the League Client API (LCU).

We plan to run the model within the local Python bridge. The bridge passes draft information to the model, and the website receives and displays the recommendations.

```text
LoL Client --> Local Bridge --> Team-Trained Model
                    |                   |
               Current Draft      Recommendations
                    |                   |
                    +---- Web Page -----+
```

## 7. Data Storage Requirements

The current draft and recommendations are kept in memory and cleared when champion selection ends. A separate database is not required because the service does not store user accounts or recommendation history.

## 8. Deployment Approach and Technical Risks

The website source is managed on GitHub and deployed on Vercel. Users run the bridge on their own PC. Installation and startup instructions will be provided in the README.

| Risk | Response |
| --- | --- |
| The bridge or LoL client cannot be reached | Show the connection status and instructions for starting and configuring them. |
| The deployed website cannot access the local bridge | Configure the bridge's allowed origin and verify the connection in a browser. |
| Recommendation inference is slow | Measure local inference time and reduce model size or complexity. |
| Training data differs from actual gameplay | Check recommendations during live champion selection and review the model as patches and champions change. |

## 9. Acceptance Criteria for the Finished Service

- The deployed URL opens a page showing the service description, draft panels, and recommendation area.
- Champions and bans displayed on the website match the live champion selection screen.
- Changing a pick or ban updates the displayed draft and recommendations to reflect that state.
- Recommendations are generated from the output of a model trained by our team.
- Champions that have already been picked or banned do not appear in the recommendation list.
- A lost connection produces an error message, and reconnecting loads the current draft.
- When champion selection ends, recommendations from that session are cleared and the page returns to a waiting state.
