-- King Family Travel Planner v7.0 public-safe seed/reference data
-- This file intentionally avoids private emails, phone numbers, full birthdays, KTN, passport numbers, and street addresses.

insert into app.households (id, name, home_city, home_state, country, primary_airport)
values
  ('stephen_household','Stephen King Household','Kyle','TX','USA','AUS'),
  ('joshua_household','Joshua King Household','Holden','MO','USA','MCI'),
  ('michael_household','Michael King Household','Kraainem',null,'Belgium','BRU'),
  ('david_household','David King Household','Sunnyvale','CA','USA','SJC'),
  ('elaire_household','Elaire Ward Household',null,'NC','USA',null)
on conflict (id) do update set name=excluded.name, home_city=excluded.home_city, home_state=excluded.home_state, country=excluded.country, primary_airport=excluded.primary_airport;

insert into app.profiles (id, household_id, display_name, relationship_label, role_label, is_child, home_city, home_state, country, primary_airport)
values
  ('stephen_king','stephen_household','Stephen King','household member','admin / household lead',false,'Kyle','TX','USA','AUS'),
  ('selma_ward','stephen_household','Selma Ward','household member','household lead',false,'Kyle','TX','USA','AUS'),
  ('ashly_king','stephen_household','Ashly King','household member','family traveler',false,'Kyle','TX','USA','AUS'),
  ('david_king','david_household','David King','household member','admin / household lead',false,'Sunnyvale','CA','USA','SJC'),
  ('elaire_ward','elaire_household','Elaire Ward','household member','household lead',false,null,'NC','USA',null),
  ('joshua_king','joshua_household','Joshua King','household member','household lead',false,'Holden','MO','USA','MCI'),
  ('christine_king','joshua_household','Christine King','household member','household lead',false,'Holden','MO','USA','MCI'),
  ('daniel_king','joshua_household','Daniel King','household member','child',true,'Holden','MO','USA','MCI'),
  ('michael_king','michael_household','Michael King','household member','household lead',false,'Kraainem',null,'Belgium','BRU'),
  ('quintin_king','michael_household','Quintin King','household member','child',true,'Kraainem',null,'Belgium','BRU'),
  ('adelaide_king','michael_household','Adelaide King','household member','child',true,'Kraainem',null,'Belgium','BRU')
on conflict (id) do update set household_id=excluded.household_id, display_name=excluded.display_name, role_label=excluded.role_label, is_child=excluded.is_child, home_city=excluded.home_city, home_state=excluded.home_state, country=excluded.country, primary_airport=excluded.primary_airport;

insert into app.household_members (household_id, profile_id, relationship, can_manage_budget, can_manage_trips)
select household_id, id, relationship_label, role_label like '%lead%' or role_label like '%admin%', role_label like '%lead%' or role_label like '%admin%'
from app.profiles
on conflict (household_id, profile_id) do update set relationship=excluded.relationship, can_manage_budget=excluded.can_manage_budget, can_manage_trips=excluded.can_manage_trips;

insert into app.loyalty_programs (id, name, category, alliance, website_url, icon_path, notes)
values
  ('aa','American Airlines AAdvantage','airline','oneworld','https://www.aa.com/aadvantage','assets/images/airlines/AA.png','Compare AA direct against Avios/oneworld partners.'),
  ('delta','Delta SkyMiles','airline','SkyTeam','https://www.delta.com/skymiles','assets/images/airlines/delta.png','Compare Delta direct against Flying Blue and Virgin Atlantic.'),
  ('united','United MileagePlus','airline','Star Alliance','https://www.united.com/mileageplus','assets/images/airlines/united.png','Compare United direct against Aeroplan, LifeMiles, Turkish, ANA, Singapore, Lufthansa.'),
  ('alaska','Alaska Mileage Plan','airline','oneworld','https://www.alaskaair.com/mileageplan','assets/images/airlines/alaska.png',null),
  ('british_airways','British Airways Executive Club','airline','oneworld','https://www.britishairways.com/en-us/executive-club','assets/images/airlines/british-airways.png',null),
  ('iberia','Iberia Plus','airline','oneworld','https://www.iberia.com/us/iberiaplus/','assets/images/airlines/iberia.png',null),
  ('qatar','Qatar Privilege Club','airline','oneworld','https://www.qatarairways.com/en/Privilege-Club.html','assets/images/airlines/qatar.png',null),
  ('cathay','Cathay Asia Miles','airline','oneworld','https://www.cathaypacific.com/cx/en_US/membership.html','assets/images/airlines/cathay.png',null),
  ('qantas','Qantas Frequent Flyer','airline','oneworld','https://www.qantas.com/us/en/frequent-flyer.html','assets/images/airlines/qantas.png',null),
  ('flying_blue','Air France/KLM Flying Blue','airline','SkyTeam','https://www.flyingblue.us/','assets/images/airlines/flying-blue.png',null),
  ('virgin_atlantic','Virgin Atlantic Flying Club','airline',null,'https://flywith.virginatlantic.com/us/en/flying-club.html','assets/images/airlines/virgin-atlantic.png',null),
  ('air_canada','Air Canada Aeroplan','airline','Star Alliance','https://www.aircanada.com/aeroplan','assets/images/airlines/air-canada.png',null),
  ('caesars_rewards','Caesars Rewards','casino',null,'https://www.caesars.com/myrewards','assets/images/casinos/caesars-rewards.png',null),
  ('mgm_rewards','MGM Rewards','casino',null,'https://www.mgmresorts.com/en/mgm-rewards.html','assets/images/casinos/mgm-rewards.png',null),
  ('hilton_honors','Hilton Honors','hotel',null,'https://www.hilton.com/en/hilton-honors/','assets/images/hotels/hilton-honors.png',null),
  ('marriott_bonvoy','Marriott Bonvoy','hotel',null,'https://www.marriott.com/loyalty.mi','assets/images/hotels/marriott-bonvoy.png',null),
  ('ihg_one_rewards','IHG One Rewards','hotel',null,'https://www.ihg.com/onerewards','assets/images/hotels/ihg-one-rewards.png',null),
  ('wyndham_rewards','Wyndham Rewards','hotel',null,'https://www.wyndhamhotels.com/wyndham-rewards','assets/images/hotels/wyndham-rewards.png',null),
  ('best_western_rewards','Best Western Rewards','hotel',null,'https://www.bestwestern.com/en_US/best-western-rewards.html','assets/images/hotels/best-western-rewards.png',null),
  ('landrys_select_club','Landry''s Select Club','dining',null,'https://www.landrysselect.com/','assets/images/loyalty/landrys-select-club.png',null),
  ('texas_state_parks','Texas State Parks Pass','park',null,'https://tpwd.texas.gov/state-parks/park-information/passes','assets/images/loyalty/texas-state-parks.png',null)
on conflict (id) do update set name=excluded.name, category=excluded.category, alliance=excluded.alliance, website_url=excluded.website_url, icon_path=excluded.icon_path, notes=excluded.notes;

insert into app.destinations (id, name, category, country, region, city, state_region, currency, official_url, image_path, type_tags, verification_status, public_data)
values
  ('krause_springs','Krause Springs','texas_weekend','USA','Texas Hill Country','Spicewood','TX','USD','https://www.krausesprings.net/','assets/images/generated/springs.png',array['natural springs','swimming hole','camping','drive'], 'verified_official', '{}'),
  ('longhorn_cavern','Longhorn Cavern State Park','texas_weekend','USA','Texas Hill Country','Burnet','TX','USD','https://visitlonghorncavern.com/','assets/images/generated/cave.png',array['cave','state park','drive'], 'verified_official', '{}'),
  ('atlantis_paradise_island','Atlantis Paradise Island','caribbean','Bahamas','Paradise Island','Nassau',null,'BSD','https://www.atlantisbahamas.com/','assets/images/destinations/atlantis.png',array['beach','casino','fly'], 'verified_official', '{}'),
  ('great_wall_china','Great Wall of China','bucket_list','China','Beijing area',null,null,'CNY',null,'assets/images/generated/great_wall_china.png',array['historic','international','fly'], 'needs_research', '{}')
on conflict (id) do update set name=excluded.name, category=excluded.category, country=excluded.country, region=excluded.region, city=excluded.city, state_region=excluded.state_region, currency=excluded.currency, official_url=excluded.official_url, image_path=excluded.image_path, type_tags=excluded.type_tags, verification_status=excluded.verification_status, public_data=excluded.public_data;
