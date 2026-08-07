## Input

1. 3 bedroom houses in Ottawa in a walkable location
2. Condos in Gatineau under 400k with a great view
3. Houses in Ottawa with a garage and a finished basement
4. 2 bedroom condos in Gatineau near good schools
5. Waterfront cottages in Ottawa with a quiet backyard
6. Houses in Gatineau with a pool and a recently updated kitchen
7. 3 bedroom homes in Ottawa close to public transit
8. Pet-friendly condos in Gatineau with at least 2 bedrooms
9. Bungalows in Ottawa in a family-friendly neighborhood
10. Houses in Gatineau under 500k that are move-in ready
11. 4 bedroom homes in Ottawa with a large backyard for kids
12. Condos in Gatineau with a fireplace and a cozy atmosphere

## Expected unsupported concepts 

1. City eq Ottawa, BedroomsTotal ge 3 — unsupported: "walkable location"
2. City eq Gatineau, CommonInterest eq Condo/Strata, ListPrice lt 400000 — unsupported: "great view"
3. City eq Ottawa, Garage eq true — unsupported: "finished basement"
4. City eq Gatineau, CommonInterest eq Condo/Strata, BedroomsTotal ge 2 — unsupported: "near good schools"
5. City eq Ottawa, Waterfront eq true, ArchitecturalStyle eq Cottage — unsupported: "quiet backyard"
6. City eq Gatineau, Pool eq true — unsupported: "recently updated kitchen"
7. City eq Ottawa, BedroomsTotal ge 3 — unsupported: "close to public transit"
8. City eq Gatineau, CommonInterest eq Condo/Strata, BedroomsTotal ge 2 — unsupported: "pet-friendly"
9. City eq Ottawa, ArchitecturalStyle eq Bungalow — unsupported: "family-friendly neighborhood"
10. City eq Gatineau, ListPrice lt 500000 — unsupported: "move-in ready"
11. City eq Ottawa, BedroomsTotal ge 4 — unsupported: "large backyard for kids"
12. City eq Gatineau, CommonInterest eq Condo/Strata, Fireplace eq true — unsupported: "cozy atmosphere"
