# Chalkie Chalkie

Your teaching and learning tool.

Chalkie Chalkie is an online collaborative blackboard designed specifically for maths tutoring, incuding features tailored for this use case.

## Tech Stack

- **Next.js**: React framework of choice
- **Vercel**: Hosting and cron jobs
- **Liveblocks**: Real time connection handling
- **Clerk**: User accounts and authentication
- **Supabase**: Recent room information

## Todo before full deployment

### General

- [ ] Ensure browser support and compatibility
- [ ] Search engine optimisation
- [ ] Stroke drawing optimisation
- [ ] Ensure API security

### Home and UI

- [ ] Home page footer
- [ ] Workspace titles
- [ ] Copy invite link
- [ ] Loading between page animation
- [ ] Additional maths scribbles on hero
- [ ] Clerk styling
- [ ] Search workspaces by title
- [ ] Workspace card loading state
- [ ] Set workspace card default values
- [ ] Icons
- [ ] Scroll animations for home page
- [ ] Toast messages - positive and negative interactions
- [ ] Allow deleting workspace

### Whiteboard and UI

- [ ] Ensure correct spacing between pen colour selection menu
- [ ] Current active and inactive user list
- [ ] Hold for perfect line
- [ ] Pen sizes
- [ ] Highlighter
- [ ] User name next to cursor
- [ ] Zooming
- [ ] Cursor image change based on selected tool
- [ ] run cron job to update liveblocks signed image urls
- [ ] pre-processing for images before upload

## Complete tasks

- [x] Consistent button styling
- [x] Invite a user to workspace within the app
- [x] Edit workspace button
- [x] Join workspace button
- [x] Center clerk login page
- [x] Update home page based on logged-in state
- [x] Update header
- [x] Pasting .png images
