package com.fittmm.app.logic;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertNull;

import org.junit.Test;

import java.util.Calendar;

/**
 * FITTMM Android – account rules (same as the website)
 * TC-A10  Password rule: 8+ characters with a letter and a number
 * TC-A11  Phone numbers normalize to E.164 and format for display
 * TC-A12  Age from a birthday, before and after this year's birthday
 */
public class AccountRulesTest {

    @Test
    public void passwordRule() {
        assertEquals("Use at least 8 characters.", AccountRules.passwordProblem("short1"));
        assertEquals("Include at least one letter and one number.", AccountRules.passwordProblem("onlyletters"));
        assertEquals("Include at least one letter and one number.", AccountRules.passwordProblem("12345678"));
        assertNull(AccountRules.passwordProblem("password123"));
    }

    @Test
    public void phones() {
        assertEquals("+16505553434", AccountRules.normalizePhone("(650) 555-3434"));
        assertEquals("+16505553434", AccountRules.normalizePhone("1 650 555 3434"));
        assertEquals("+442079460958", AccountRules.normalizePhone("+44 20 7946 0958"));
        assertNull(AccountRules.normalizePhone("555-3434"));
        assertEquals("+1 650-555-3434", AccountRules.formatPhone("+16505553434"));
        assertEquals("+442079460958", AccountRules.formatPhone("+442079460958"));
    }

    @Test
    public void age() {
        Calendar today = Calendar.getInstance();
        today.set(2026, Calendar.OCTOBER, 27);
        assertEquals(Integer.valueOf(27), AccountRules.ageOn("1999-04-12", today));
        assertEquals(Integer.valueOf(26), AccountRules.ageOn("1999-12-01", today));
        assertEquals(Integer.valueOf(26), AccountRules.ageOn("2000-10-27", today));
        assertNull(AccountRules.ageOn("", today));
    }
}
