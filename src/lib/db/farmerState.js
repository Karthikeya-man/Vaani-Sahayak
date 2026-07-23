import { pool } from './db.js';

/**
 * Retrieves the full composite state of a farmer, joining FARMER + FARMER_PLOT + FARMER_PREFERENCES.
 *
 * @param {string} farmerId - UUID of the farmer.
 * @returns {Promise<Object|null>} Joined farmer state object or null if farmer not found.
 */
export async function getFarmerState(farmerId) {
    if (!farmerId || typeof farmerId !== 'string') {
        throw new Error('Valid farmerId (UUID string) is required.');
    }

    const query = `
        SELECT 
            f.id AS farmer_id,
            f.name,
            f.phone,
            f.district,
            f.state,
            f.language,
            f.created_at AS farmer_created_at,
            
            p.id AS plot_id,
            p.crop,
            p.land_acres,
            p.sowing_date,
            p.expected_harvest_date,
            p.soil_type,
            
            pref.id AS pref_id,
            pref.price_alert_threshold,
            pref.alert_channels,
            pref.notification_opt_in
        FROM "FARMER" f
        LEFT JOIN "FARMER_PLOT" p ON f.id = p.farmer_id
        LEFT JOIN "FARMER_PREFERENCES" pref ON f.id = pref.farmer_id
        WHERE f.id = $1;
    `;

    const { rows } = await pool.query(query, [farmerId]);
    if (rows.length === 0) {
        return null;
    }

    const row = rows[0];
    return {
        id: row.farmer_id,
        name: row.name,
        phone: row.phone,
        district: row.district,
        state: row.state,
        language: row.language,
        created_at: row.farmer_created_at,
        plot: row.plot_id ? {
            id: row.plot_id,
            crop: row.crop,
            land_acres: row.land_acres !== null ? parseFloat(row.land_acres) : null,
            sowing_date: row.sowing_date,
            expected_harvest_date: row.expected_harvest_date,
            soil_type: row.soil_type
        } : null,
        preferences: row.pref_id ? {
            id: row.pref_id,
            price_alert_threshold: row.price_alert_threshold !== null ? parseFloat(row.price_alert_threshold) : null,
            alert_channels: row.alert_channels || [],
            notification_opt_in: Boolean(row.notification_opt_in)
        } : null
    };
}

/**
 * Upserts a FARMER_PLOT record for the specified farmer.
 *
 * @param {string} farmerId - UUID of the farmer.
 * @param {Object} plotData - Plot details (crop, land_acres, sowing_date, expected_harvest_date, soil_type).
 * @returns {Promise<Object>} Updated/Created plot record.
 */
export async function updateFarmerPlot(farmerId, plotData) {
    if (!farmerId || typeof farmerId !== 'string') {
        throw new Error('Valid farmerId (UUID string) is required.');
    }
    if (!plotData || typeof plotData !== 'object') {
        throw new Error('plotData object is required.');
    }

    // Verify farmer exists
    const farmerCheck = await pool.query(`SELECT id FROM "FARMER" WHERE id = $1`, [farmerId]);
    if (farmerCheck.rows.length === 0) {
        throw new Error(`Farmer with ID ${farmerId} does not exist.`);
    }

    const existingPlot = await pool.query(`SELECT id FROM "FARMER_PLOT" WHERE farmer_id = $1 LIMIT 1`, [farmerId]);

    if (existingPlot.rows.length > 0) {
        const updateQuery = `
            UPDATE "FARMER_PLOT"
            SET 
                crop = COALESCE($2, crop),
                land_acres = COALESCE($3, land_acres),
                sowing_date = COALESCE($4, sowing_date),
                expected_harvest_date = COALESCE($5, expected_harvest_date),
                soil_type = COALESCE($6, soil_type),
                updated_at = CURRENT_TIMESTAMP
            WHERE farmer_id = $1
            RETURNING *;
        `;
        const res = await pool.query(updateQuery, [
            farmerId,
            plotData.crop || null,
            plotData.land_acres !== undefined ? plotData.land_acres : null,
            plotData.sowing_date || null,
            plotData.expected_harvest_date || null,
            plotData.soil_type || null
        ]);
        return res.rows[0];
    } else {
        if (!plotData.crop || plotData.land_acres === undefined || !plotData.sowing_date || !plotData.expected_harvest_date) {
            throw new Error('Required plot fields (crop, land_acres, sowing_date, expected_harvest_date) are missing for new plot insertion.');
        }

        const insertQuery = `
            INSERT INTO "FARMER_PLOT" (farmer_id, crop, land_acres, sowing_date, expected_harvest_date, soil_type)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        `;
        const res = await pool.query(insertQuery, [
            farmerId,
            plotData.crop,
            plotData.land_acres,
            plotData.sowing_date,
            plotData.expected_harvest_date,
            plotData.soil_type || null
        ]);
        return res.rows[0];
    }
}

/**
 * Upserts a FARMER_PREFERENCES record for the specified farmer.
 *
 * @param {string} farmerId - UUID of the farmer.
 * @param {Object} prefsData - Preference settings (price_alert_threshold, alert_channels, notification_opt_in).
 * @returns {Promise<Object>} Updated/Created preferences record.
 */
export async function updatePreferences(farmerId, prefsData) {
    if (!farmerId || typeof farmerId !== 'string') {
        throw new Error('Valid farmerId (UUID string) is required.');
    }
    if (!prefsData || typeof prefsData !== 'object') {
        throw new Error('prefsData object is required.');
    }

    // Verify farmer exists
    const farmerCheck = await pool.query(`SELECT id FROM "FARMER" WHERE id = $1`, [farmerId]);
    if (farmerCheck.rows.length === 0) {
        throw new Error(`Farmer with ID ${farmerId} does not exist.`);
    }

    const existingPref = await pool.query(`SELECT id FROM "FARMER_PREFERENCES" WHERE farmer_id = $1 LIMIT 1`, [farmerId]);

    if (existingPref.rows.length > 0) {
        const updateQuery = `
            UPDATE "FARMER_PREFERENCES"
            SET 
                price_alert_threshold = COALESCE($2, price_alert_threshold),
                alert_channels = COALESCE($3, alert_channels),
                notification_opt_in = COALESCE($4, notification_opt_in),
                updated_at = CURRENT_TIMESTAMP
            WHERE farmer_id = $1
            RETURNING *;
        `;
        const res = await pool.query(updateQuery, [
            farmerId,
            prefsData.price_alert_threshold !== undefined ? prefsData.price_alert_threshold : null,
            prefsData.alert_channels || null,
            prefsData.notification_opt_in !== undefined ? prefsData.notification_opt_in : null
        ]);
        return res.rows[0];
    } else {
        const insertQuery = `
            INSERT INTO "FARMER_PREFERENCES" (farmer_id, price_alert_threshold, alert_channels, notification_opt_in)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const res = await pool.query(insertQuery, [
            farmerId,
            prefsData.price_alert_threshold !== undefined ? prefsData.price_alert_threshold : null,
            prefsData.alert_channels || ['push', 'sms', 'ivr'],
            prefsData.notification_opt_in !== undefined ? prefsData.notification_opt_in : true
        ]);
        return res.rows[0];
    }
}
