# Memory - Webflow Hybrid App

## Shared Constants Pattern
- Created `shared/constants.ts` for constants shared between frontend and backend
- Frontend imports TypeScript paths directly: `../../../shared/constants`
- Backend uses `.js` extension for ESM imports: `../../shared/constants.js`
- Export both array and Set versions for different usage patterns (`UNNECESSARY_FIELDS` vs `UNNECESSARY_FIELDS_SET`)
- Type imports work correctly from both frontend and backend

## Project Structure
- Backend: `Data Client/` - Node.js/Express with TypeScript, ESM modules
- Frontend: `Designer Extension/src/` - React + webpack + TypeScript
- Shared: `shared/` - TypeScript files for constants and types used by both sides

## TypeScript Setup
- Backend uses `import` with `.js` extensions for compiled output
- Frontend uses standard TypeScript module resolution
- Both sides use TypeScript but different compilation targets