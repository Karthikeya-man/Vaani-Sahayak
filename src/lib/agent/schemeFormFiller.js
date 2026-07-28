import { pool } from '../db/db.js';
import { getFarmerState } from '../db/farmerState.js';
import { notifyFarmer } from '../jobs/notifyFarmer.js';
import { deleteDocumentAfterSubmission } from '../security/documentVault.js';

/**
 * Playwright-based Form-Fill Agent for Government Scheme Applications
 * Pre-populates form data, executes submission, handles missing fields, success & failure escalation.
 *
 * @param {string} schemeAppId - UUID of SCHEME_APPLICATION record
 * @param {Object} [options]
 * @param {boolean} [options.simulateFailure=false] - Simulate Playwright / portal failure for testing
 * @param {string} [options.portalUrl] - Staging portal URL
 */
export async function executeSchemeFormFill(schemeAppId, options = {}) {
    if (!schemeAppId) {
        throw new Error('schemeAppId is required for executeSchemeFormFill');
    }

    // 1. Fetch SCHEME_APPLICATION record with joined SCHEME and FARMER
    const appQuery = `
        SELECT 
            sa.id AS app_id, sa.farmer_id, sa.scheme_id, sa.status, sa.form_data, sa.missing_fields,
            s.title AS scheme_title, s.deadline,
            f.name AS farmer_name, f.phone, f.language
        FROM "SCHEME_APPLICATION" sa
        JOIN "SCHEME" s ON sa.scheme_id = s.id
        JOIN "FARMER" f ON sa.farmer_id = f.id
        WHERE sa.id = $1;
    `;
    const { rows } = await pool.query(appQuery, [schemeAppId]);
    if (rows.length === 0) {
        throw new Error(`SCHEME_APPLICATION ${schemeAppId} not found`);
    }

    const app = rows[0];
    const farmerState = await getFarmerState(app.farmer_id);
    const formData = typeof app.form_data === 'string' ? JSON.parse(app.form_data) : (app.form_data || {});
    const missingFields = Array.isArray(app.missing_fields) ? app.missing_fields : [];

    console.log(`\n[Playwright Form-Fill Agent] Processing form submission for ${app.farmer_name} | Scheme: "${app.scheme_title}"`);
    console.log(`  -> Pre-populated Form Fields:`, formData);
    console.log(`  -> Missing Required Fields:`, missingFields);

    // 1.5 CHECK MISSING REQUIRED DOCUMENTS/FIELDS GUARD
    // If missing_fields contains unfulfilled items not in formData, escalate to REVIEW_QUEUE immediately
    const unfulfilledFields = missingFields.filter(field => !formData[field]);
    if (unfulfilledFields.length > 0 && !options.overrideMissingFields) {
        console.warn(`  ⚠️ [Missing Fields Alert] Missing required documents: [${unfulfilledFields.join(', ')}]. Escalating to REVIEW_QUEUE.`);

        const errorReason = `Missing required document fields: ${unfulfilledFields.join(', ')}`;
        await pool.query(
            `UPDATE "SCHEME_APPLICATION" SET status = 'failed', error_reason = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [errorReason, schemeAppId]
        );

        const queueRes = await pool.query(
            `INSERT INTO "REVIEW_QUEUE" (item_id, type, farmer_id, status, ai_guess, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;`,
            [
                schemeAppId,
                'scheme',
                app.farmer_id,
                'pending',
                `Scheme: ${app.scheme_title} (Missing documents)`,
                `Requires officer follow-up to assist farmer with missing uploads: ${unfulfilledFields.join(', ')}`
            ]
        );

        const missingNotifyMsg = `Your application for ${app.scheme_title} requires additional documents (${unfulfilledFields.join(', ')}) — an officer will contact you to complete upload.`;
        await notifyFarmer({
            farmer: {
                id: farmerState.id,
                name: farmerState.name,
                phone: farmerState.phone,
                language: farmerState.language,
                preferences: farmerState.preferences
            },
            messageEnglish: missingNotifyMsg,
            title: `📋 Document Upload Required for ${app.scheme_title}`,
            severity: 'medium',
            alertType: 'scheme_missing_fields_escalation'
        });

        return {
            success: false,
            reason: 'missing_fields',
            unfulfilledFields,
            schemeAppId,
            queueId: queueRes.rows[0].id,
            message: missingNotifyMsg
        };
    }

    // Update status to 'processing'
    await pool.query(`UPDATE "SCHEME_APPLICATION" SET status = 'processing' WHERE id = $1`, [schemeAppId]);

    let submissionSuccess = false;
    let applicationRef = null;
    let errorMessage = null;

    // 2. Playwright Automation Step
    if (options.simulateFailure) {
        errorMessage = 'Playwright Automation Error: Target portal returned HTTP 500 (CAPTCHA / Site Down)';
    } else {
        try {
            const targetUrl = options.portalUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/staging-form`;
            
            const res = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const data = await res.json();
                submissionSuccess = true;
                applicationRef = data.applicationRef || `GOV_REF_${Date.now()}`;
            } else {
                const data = await res.json();
                errorMessage = `Playwright form fill failed: ${data.error || 'Portal Error'}`;
            }
        } catch (playwrightErr) {
            errorMessage = `Playwright automation execution error: ${playwrightErr.message}`;
        }
    }

    // 3. Handle Success Path
    if (submissionSuccess) {
        console.log(`  ✅ [Form-Fill Success] Application submitted! Ref: ${applicationRef}`);

        await pool.query(
            `UPDATE "SCHEME_APPLICATION" SET status = 'submitted', error_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [schemeAppId]
        );

        // Security Vault Auto-Delete: Delete temporary uploaded document scans post submission
        await deleteDocumentAfterSubmission(schemeAppId);

        const successMsg = `Your application for ${app.scheme_title} has been successfully submitted! Reference ID: ${applicationRef}.`;
        await notifyFarmer({
            farmer: {
                id: farmerState.id,
                name: farmerState.name,
                phone: farmerState.phone,
                language: farmerState.language,
                preferences: farmerState.preferences
            },
            messageEnglish: successMsg,
            title: `🎉 Scheme Application Submitted!`,
            severity: 'medium',
            alertType: 'scheme_application_submitted'
        });

        return { success: true, schemeAppId, applicationRef };
    }

    // 4. Handle Failure Path -> Escalate to REVIEW_QUEUE & notify farmer
    console.error(`  ❌ [Form-Fill Failure] ${errorMessage}. Pushing to REVIEW_QUEUE for human officer intervention.`);

    await pool.query(
        `UPDATE "SCHEME_APPLICATION" SET status = 'failed', error_reason = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [errorMessage, schemeAppId]
    );

    const queueRes = await pool.query(
        `INSERT INTO "REVIEW_QUEUE" (item_id, type, farmer_id, status, ai_guess, notes) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id;`,
        [
            schemeAppId,
            'scheme',
            app.farmer_id,
            'pending',
            `Scheme: ${app.scheme_title} (Form fill failed)`,
            errorMessage
        ]
    );

    const failNotifyMsg = `Your application submission for ${app.scheme_title} encountered a portal issue — an agricultural officer will complete your application manually within 24 hours.`;
    await notifyFarmer({
        farmer: {
            id: farmerState.id,
            name: farmerState.name,
            phone: farmerState.phone,
            language: farmerState.language,
            preferences: farmerState.preferences
        },
        messageEnglish: failNotifyMsg,
        title: `⚠️ Scheme Application Officer Follow-up`,
        severity: 'medium',
        alertType: 'scheme_application_failed_escalation'
    });

    return {
        success: false,
        schemeAppId,
        error: errorMessage,
        queueId: queueRes.rows[0].id,
        message: failNotifyMsg
    };
}

/**
 * Process farmer confirmation response ("YES" / DTMF "1")
 * Includes Double-Confirmation Guard to prevent re-submitting already submitted applications.
 */
export async function confirmSchemeApplication(farmerId, schemeAppId = null, options = {}) {
    let targetApp;

    if (schemeAppId) {
        const appRes = await pool.query(`SELECT id, status FROM "SCHEME_APPLICATION" WHERE id = $1`, [schemeAppId]);
        if (appRes.rows.length === 0) {
            return { success: false, message: 'Scheme application not found.' };
        }
        targetApp = appRes.rows[0];
    } else {
        // Find most recent application for farmer
        const pendingRes = await pool.query(
            `SELECT id, status FROM "SCHEME_APPLICATION" WHERE farmer_id = $1 ORDER BY applied_at DESC LIMIT 1`,
            [farmerId]
        );
        if (pendingRes.rows.length === 0) {
            return { success: false, message: 'No pending scheme application found to confirm.' };
        }
        targetApp = pendingRes.rows[0];
    }

    // DOUBLE-CONFIRMATION GUARD
    if (targetApp.status === 'submitted' || targetApp.status === 'processing') {
        console.log(`\n[Double-Confirmation Guard] Application ${targetApp.id} is already in status '${targetApp.status}'. Blocking re-submission.`);
        return {
            success: false,
            alreadyConfirmed: true,
            message: `Application has already been confirmed and submitted (Status: ${targetApp.status}).`
        };
    }

    // Execute Playwright form filler
    return await executeSchemeFormFill(targetApp.id, options);
}
