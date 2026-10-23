ALTER TABLE sd_opp ADD COLUMN business_status VARCHAR(16) NOT NULL DEFAULT 'INITIAL', ADD COLUMN signed_date DATE, ADD COLUMN lost_date DATE;
-- Existing business records receive the neutral initial default; no stage-based reclassification.
ALTER TABLE sd_opp ADD CONSTRAINT sd_opp_business_status_ck CHECK(business_status IN ('INITIAL','FOLLOWING','VOID','SIGNED','LOST')),
 ADD CONSTRAINT sd_opp_business_dates_ck CHECK ((business_status='SIGNED' AND signed_date IS NOT NULL AND lost_date IS NULL) OR (business_status='LOST' AND lost_date IS NOT NULL AND signed_date IS NULL) OR (business_status IN ('INITIAL','FOLLOWING','VOID') AND signed_date IS NULL AND lost_date IS NULL));
CREATE INDEX sd_opp_business_forecast_idx ON sd_opp(application_id,business_status,expected_sign_date);
