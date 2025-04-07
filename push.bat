@echo off
echo Pushing to GitHub...
git add .
git commit -m "Update site"
git push -u origin main
echo Push completed!
pause 