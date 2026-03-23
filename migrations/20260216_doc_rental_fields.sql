-- Document Tracker fields
ALTER TABLE leads ADD COLUMN doc_preapproval_received INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN doc_proof_of_funds_received INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN doc_buyer_agency_signed INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN doc_listing_agreement_signed INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN doc_property_disclosures_received INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN doc_hoa_docs_received INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN doc_notes TEXT;

-- Rental-specific fields
ALTER TABLE leads ADD COLUMN rent_min INTEGER;
ALTER TABLE leads ADD COLUMN rent_max INTEGER;
ALTER TABLE leads ADD COLUMN lease_start_date TEXT;
ALTER TABLE leads ADD COLUMN pets_allowed INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN application_submitted INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN landlord_contact_name TEXT;
ALTER TABLE leads ADD COLUMN landlord_contact_phone TEXT;
ALTER TABLE leads ADD COLUMN landlord_contact_email TEXT;
ALTER TABLE leads ADD COLUMN rental_notes TEXT;
