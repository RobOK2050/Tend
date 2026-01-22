# Group Priority Configuration

## Group Folder Priority Order

Groups are checked in order. The **first match** determines folder placement.
All groups are still stored in the `communities` frontmatter field.

1. O. Life Connections
2. Family
3. Arc Aspicio
4. Cornell
5. Accenture
6. James Martin
7. F-M
8. 0. Reconnect
9. 1. Bitcoin
10. 1. Tech Advisor
11. 1. Photography
12. 2A. Core
13. 2B. Community
14. 3. Federal Core
15. 3. Federal
16. 3. Cadre DC
17. 3. OGM
18. 3. MMT
19. 3. University Club
20. 5. Bluffton
21. 5. NYC
22. 5. NYU and Tisch
23. 5. Spirit
24. 3. People I Want to Meet
25. 3. OPM49 and 3D
26. 3. New Dominion Angels (NDA)
27. 5. Bourbon
28. 5. Wine
29. 5. Health
30. 2C. Outer Ring
31. 2D. Acquaintance
32. Clients
33. Federal - Outer Ring
34. Vendors

## Fallback Rules

- **No matching group**: → `Ungrouped/`
- **No groups at all** (empty communities): → `Ungrouped/`
- **Multiple groups**: First matching group in priority order wins
