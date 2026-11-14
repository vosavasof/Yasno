CREATE TABLE yasna_payment_config (id INTEGER PRIMARY KEY CHECK(id=1),json TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE yasna_payment_orders (id TEXT PRIMARY KEY,provider_id TEXT UNIQUE,active_key TEXT UNIQUE,status TEXT NOT NULL,created INTEGER NOT NULL,json TEXT NOT NULL);
