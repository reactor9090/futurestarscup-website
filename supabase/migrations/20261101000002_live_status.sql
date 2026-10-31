-- Meci în desfășurare: scorul live se vede pe site, dar clasamentul și statisticile
-- iau în calcul doar meciurile terminate (view-urile filtrează pe 'finished').
alter type match_status add value if not exists 'live' after 'scheduled';
