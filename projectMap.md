# SureShot Project Map

This file is a quick guide to the project structure and app flow. Use it as the "map" before opening the code.

## 1. Project Purpose

SureShot is a Vite + React field-auditor app. Right now it has one working module, **SureCheck**, which lets a field user punch in for attendance using:

- GPS location check
- Camera selfie capture
- Image watermarking
- Upload to an API
- Offline draft saving when network upload is not possible

## 2. Top-Level Files

### 2A. `index.html`

The browser loads this first.

It contains:

- Basic mobile/app metadata
- A favicon
- `<div id="root"></div>`, where React renders the app
- A script tag that starts `/src/main.jsx`

### 2B. `src/main.jsx`

This is the React entry point.

Flow:

1. Imports global theme CSS.
2. Imports `App.jsx`.
3. Finds the `root` div in `index.html`.
4. Mounts the React app inside `<StrictMode>`.

### 2C. `vite.config.js`

This configures Vite.

It handles:

- React plugin support
- Development server settings
- Production build settings
- Vendor chunk splitting for caching
- `VITE_` environment variable exposure

### 2D. `package.json`

Defines the project scripts and dependencies.

Important scripts:

- `npm run dev`: starts the local Vite dev server
- `npm run build`: creates the production build
- `npm run preview`: previews the production build
- `npm run lint`: runs linting on source files

## 3. Main App Flow

### 3A. `src/App.jsx`

This is the app shell.

Main responsibilities:

1. Wraps everything in `AppProvider`.
2. Shows the global layout: `Header`, `Sidebar`, and main content.
3. Decides whether to show the home `Hub` or an active module.
4. Lazy-loads `SureCheck` only when needed.
5. Displays global API error toasts.

Flow:

1. User opens the app.
2. `AppProvider` makes global state available.
3. `Shell` renders the header/sidebar/main area.
4. If no module is selected, `Hub` appears.
5. If a module is selected, `ModuleRenderer` shows that module.

### 3B. `src/context/AppContext.jsx`

This is the shared global state layer.

It provides:

- `isOnline`: browser network state
- `activeTool`: currently selected module, or `null` for Hub
- `userSession`: mocked user/site identity
- `theme`: light/dark theme
- `draftCount`: number of offline drafts
- `apiErrors`: global API errors

It also provides actions:

- `setActiveTool`
- `toggleTheme`
- `refreshDraftCount`
- `dismissError`

## 4. Shared UI Components

### 4A. `src/components/Header.jsx`

The fixed top bar.

Shows:

- Menu button
- SureShot brand
- Current module name
- Online/offline status
- Draft count badge
- Theme toggle
- User initials

### 4B. `src/components/Sidebar.jsx`

The navigation drawer.

Important part:

- `MODULE_REGISTRY` lists all modules shown in the app.

Current modules:

- `SureCheck`: available
- `SureStock`: coming soon
- `SureAudit`: coming soon

Navigation flow:

1. User opens sidebar.
2. User selects Hub or a module.
3. Sidebar calls `onNavigate`.
4. `App.jsx` updates `activeTool`.

### 4C. `src/components/Hub.jsx`

The home dashboard.

Shows:

- Greeting and user/site info
- Online/offline status
- Draft status
- Date
- Module cards
- Placeholder quick stats

When the user clicks an available module card, Hub calls `onNavigate(module)`.

## 5. SureCheck Module Flow

### 5A. `src/modules/SureCheck/SureCheck.jsx`

This is the main attendance module.

Overall flow:

1. Check GPS location.
2. Let user start camera.
3. Capture selfie.
4. Let user review selfie.
5. Submit capture.
6. Validate and watermark image.
7. Upload online, or save draft offline.
8. Show success, draft saved, or error screen.

Flow states:

- `IDLE`: starting screen with Punch In button
- `CAPTURING`: camera is open
- `REVIEWING`: selfie has been captured
- `UPLOADING`: upload/watermark process is running
- `SUCCESS`: upload succeeded
- `DRAFT_SAVED`: offline/network fallback saved a draft
- `ERROR`: validation/upload failed

### 5B. `src/modules/SureCheck/GpsStatus.jsx`

Displays GPS state.

It can show:

- Loading while location is being acquired
- Error if permission/device/location fails
- Result card showing inside/outside geofence
- Distance bar showing how far the user is from the site radius

### 5C. `src/modules/SureCheck/CameraView.jsx`

Displays camera UI.

It can show:

- Idle camera prompt
- Camera error and retry button
- Live camera preview
- Shutter button
- Captured selfie preview
- Retake button

### 5D. `src/modules/SureCheck/useGpsFence.js`

Custom hook that handles location checking.

Flow:

1. Uses browser `navigator.geolocation`.
2. Gets the user's latitude and longitude.
3. Compares user position to a mock site location.
4. Calculates distance using the Haversine formula.
5. Returns whether the user is within the allowed radius.

Current mock site:

- Andheri West Depot
- 200 meter radius

### 5E. `src/modules/SureCheck/useCamera.js`

Custom hook that handles camera access and selfie capture.

Flow:

1. Requests front camera access using `getUserMedia`.
2. Attaches camera stream to the video element.
3. Captures the current video frame into a canvas.
4. Converts canvas output to a JPEG Blob.
5. Creates a preview URL.
6. Stops the camera after capture.
7. Cleans up camera stream and preview URLs on unmount.

## 6. Services

### 6A. `src/services/api.js`

Central API wrapper.

Handles:

- GET/POST/PUT/PATCH/DELETE helpers
- Base URL from `VITE_API_BASE_URL`
- JSON parsing
- Timeout handling
- Auth token attachment from `sessionStorage`
- Global error events
- Upload progress via `XMLHttpRequest`

Important flow:

1. A service/module calls `api.get`, `api.post`, or `api.upload`.
2. `api.js` builds the request.
3. If the request fails, it dispatches `sureshot:api-error`.
4. `AppContext` listens for that event.
5. `App.jsx` shows the error toast.

### 6B. `src/services/uploader.js`

The full capture upload pipeline.

Main function:

- `uploadCapture(options)`

Flow:

1. Validate capture with anti-spoof rules.
2. Apply watermark using Canvas.
3. If offline, save draft immediately.
4. If online, build `FormData`.
5. Upload image and metadata through `api.upload`.
6. If upload fails and drafts are allowed, save draft.

Important helper functions:

- `validateCapture`: checks image type, age, and size
- `applyWatermark`: draws date/time/GPS/branding onto the image
- `saveDraft`: stores an offline draft in `localStorage`
- `getDrafts`: reads offline drafts
- `removeDraft`: removes one draft
- `clearDrafts`: clears all drafts

## 7. Styling Files

These files control layout and visuals only. They do not control app logic.

- `src/theme.css`: global tokens, colors, typography, base theme
- `src/App.module.css`: shell layout, loading skeleton, toasts
- `src/components/*.module.css`: component-specific UI styles
- `src/modules/SureCheck/*.module.css`: SureCheck-specific UI styles

## 8. Full User Journey

1. User opens the app.
2. `index.html` loads.
3. `main.jsx` mounts React.
4. `App.jsx` renders the shell inside `AppProvider`.
5. `AppContext` starts tracking network, theme, user, drafts, and errors.
6. User sees `Hub`.
7. User selects `SureCheck`.
8. `App.jsx` lazy-loads and renders `SureCheck`.
9. `useGpsFence` checks location.
10. User taps **Punch In**.
11. `useCamera` opens the front camera.
12. User captures selfie.
13. User reviews selfie and submits.
14. `uploader.js` validates and watermarks the image.
15. If online, `api.js` uploads the image.
16. If offline or upload fails, `uploader.js` saves a draft.
17. `SureCheck` shows success, draft saved, or error.
18. `AppContext` refreshes draft count so Header/Hub stay updated.

## 9. How To Add A New Module

1. Create a new module folder under `src/modules`.
2. Add the module component.
3. Add a new entry to `MODULE_REGISTRY` in `src/components/Sidebar.jsx`.
4. Add a matching case in `ModuleRenderer` inside `src/App.jsx`.
5. Add any needed services/hooks.
6. Add module CSS in the module folder if needed.

## 10. Mental Model

Think of the project in layers:

1. **HTML/Vite boot layer**: `index.html`, `main.jsx`, `vite.config.js`
2. **App shell layer**: `App.jsx`
3. **Global state layer**: `AppContext.jsx`
4. **Navigation/home layer**: `Header`, `Sidebar`, `Hub`
5. **Feature module layer**: `SureCheck`
6. **Browser capability hooks**: camera and GPS hooks
7. **Service layer**: API and uploader
8. **Styling layer**: CSS modules and global theme

