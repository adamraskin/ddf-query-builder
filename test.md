## Input

1. 3 bedroom, 2 bathroom houses in Ottawa between 400k and 600k with a garage
2. Condos in Gatineau with at least 2 bedrooms, under 350000, no pool
3. aterfront residential properties with 4+ bedrooms and at least 3 bathrooms
4. Cheapest 2 bedroom condos in Ottawa first
5. Houses in Gatineau sorted by bedrooms, most first
6. Show me listings in Ottawa ordered by price from low to high, then by bathroom count
7. Just show me houses in Gatineau

## Output 

1. https://ddfapi.realtor.ca/odata/v1/Property?$filter=City%20eq%20'Ottawa'%20and%20BedroomsTotal%20ge%203%20and%20BathroomsTotalInteger%20eq%202%20and%20PropertyType%20eq%20'Residential'%20and%20ListPrice%20ge%20400000%20and%20ListPrice%20le%20600000%20and%20GarageYN%20eq%20true&$top=25
2. https://ddfapi.realtor.ca/odata/v1/Property?$filter=City%20eq%20'Gatineau'%20and%20PropertyType%20eq%20'Condo'%20and%20BedroomsTotal%20ge%202%20and%20ListPrice%20lt%20350000%20and%20PoolYN%20eq%20false&$top=25
3. https://ddfapi.realtor.ca/odata/v1/Property?$filter=PropertyType%20eq%20'Residential'%20and%20BedroomsTotal%20ge%204%20and%20BathroomsTotalInteger%20ge%203%20and%20WaterfrontYN%20eq%20true&$top=25
4. https://ddfapi.realtor.ca/odata/v1/Property?$filter=City%20eq%20'Ottawa'%20and%20PropertyType%20eq%20'Condo'%20and%20BedroomsTotal%20ge%202&$orderby=ListPrice%20asc&$top=25
5. https://ddfapi.realtor.ca/odata/v1/Property?$filter=City%20eq%20'Gatineau'&$orderby=BedroomsTotal%20desc&$top=25
6. https://ddfapi.realtor.ca/odata/v1/Property?$filter=City%20eq%20'Ottawa'&$orderby=ListPrice%20asc%2CBathroomsTotalInteger%20asc&$top=25
7. https://ddfapi.realtor.ca/odata/v1/Property?$filter=City%20eq%20'Gatineau'&$top=25

## Input

1. Walkable 3 bedroom homes near good schools in Ottawa under 500k
2. Recently renovated houses with a finished basement in Gatineau
3. Pet-friendly condos with a view, at least 2 bedrooms
4. Commercial properties in Ottawa or Gatineau
5. Houses that aren't waterfront

## Output

1. https://ddfapi.realtor.ca/odata/v1/Property?$filter=City%20eq%20'Ottawa'%20and%20BedroomsTotal%20ge%203%20and%20ListPrice%20lt%20500000&$top=25
2. https://ddfapi.realtor.ca/odata/v1/Property?$filter=City%20eq%20'Gatineau'%20and%20PropertyType%20eq%20'Residential'%20and%20PoolYN%20eq%20false%20and%20WaterfrontYN%20eq%20false%20and%20GarageYN%20eq%20false&$top=25
3. https://ddfapi.realtor.ca/odata/v1/Property?$filter=PropertyType%20eq%20'Condo'%20and%20BedroomsTotal%20ge%202&$orderby=ListPrice%20asc&$top=25
4. https://ddfapi.realtor.ca/odata/v1/Property?$filter=contains(City%2C%20'Ottawa')%20and%20contains(City%2C%20'Gatineau')%20and%20PropertyType%20eq%20'Commercial'&$top=25
5. https://ddfapi.realtor.ca/odata/v1/Property?$filter=PropertyType%20eq%20'Residential'%20and%20WaterfrontYN%20eq%20false&$top=25

## Input

1. Looking for a residential property in Ottawa, ideally 4 or more bedrooms and at least 2.5 bathrooms, priced between 450000 and 700000, must have a garage and a pool, not on a waterfront, close to good public transit, and show me the top 8 results sorted by price from low to high
2. I want condos in Gatineau, at least 2 bedrooms and 2 bathrooms, under 400k, with a view of the river, in a pet-friendly building, no pool needed but a garage would be nice, skip the first 5 and give me the next 10
3. Find residential homes in Ottawa or Gatineau with 3 to 5 bedrooms, at least 2 bathrooms, a finished basement, central air conditioning, built after 2010, under 600000, waterfront preferred, sorted by bedrooms descending then price ascending
4. Multi-family properties in Ottawa with at least 4 bedrooms, 3+ bathrooms, a garage, walking distance to schools and parks, no HOA fees, priced under 900000, recently renovated kitchen, show me 6 results ordered by list price from high to low
5. I need a waterfront cottage-style property, 2 to 3 bedrooms, at least 1 bathroom, a boat launch or dock access, detached garage, wood stove or fireplace, under 500k, in a quiet area away from major roads, no pool required, first 4 results

## Output

1. https://ddfapi.realtor.ca/odata/v1/Property?$filter=City%20eq%20'Ottawa'%20and%20PropertyType%20eq%20'Residential'%20and%20BedroomsTotal%20ge%204%20and%20BathroomsTotalInteger%20ge%202.5%20and%20ListPrice%20ge%20450000%20and%20ListPrice%20le%20700000%20and%20GarageYN%20eq%20true%20and%20PoolYN%20eq%20true%20and%20WaterfrontYN%20eq%20false&$orderby=ListPrice%20asc&$top=8
2. https://ddfapi.realtor.ca/odata/v1/Property?$filter=City%20eq%20'Gatineau'%20and%20PropertyType%20eq%20'Condo'%20and%20BedroomsTotal%20ge%202%20and%20BathroomsTotalInteger%20ge%202%20and%20ListPrice%20lt%20400000%20and%20WaterfrontYN%20eq%20true%20and%20PoolYN%20eq%20false%20and%20GarageYN%20eq%20true&$top=10&$skip=5
3. https://ddfapi.realtor.ca/odata/v1/Property?$filter=contains(City%2C%20'Ottawa')%20and%20contains(City%2C%20'Gatineau')%20and%20PropertyType%20eq%20'Residential'%20and%20BedroomsTotal%20ge%203%20and%20BedroomsTotal%20le%205%20and%20BathroomsTotalInteger%20ge%202%20and%20WaterfrontYN%20eq%20true%20and%20ListPrice%20lt%20600000%20and%20GarageYN%20eq%20true&$orderby=BedroomsTotal%20desc%2CListPrice%20asc&$top=25
4. https://ddfapi.realtor.ca/odata/v1/Property?$filter=City%20eq%20'Ottawa'%20and%20PropertyType%20eq%20'MultiFamily'%20and%20BedroomsTotal%20ge%204%20and%20BathroomsTotalInteger%20ge%203%20and%20GarageYN%20eq%20true%20and%20ListPrice%20lt%20900000%20and%20WaterfrontYN%20eq%20false%20and%20PoolYN%20eq%20false%20and%20contains(City%2C%20'schools')%20and%20contains(City%2C%20'parks')%20and%20ListPrice%20lt%20900000&$orderby=ListPrice%20desc&$top=6
5. https://ddfapi.realtor.ca/odata/v1/Property?$filter=contains(City%2C%20'quiet')%20and%20PropertyType%20eq%20'Residential'%20and%20BedroomsTotal%20ge%202%20and%20BedroomsTotal%20le%203%20and%20BathroomsTotalInteger%20ge%201%20and%20WaterfrontYN%20eq%20true%20and%20ListPrice%20lt%20500000%20and%20GarageYN%20eq%20true%20and%20PoolYN%20eq%20false&$orderby=ListPrice%20asc&$top=4