// Test script for Middle East phone validation
const phoneValidationRules = {
    'EG': {
        name: 'Egypt',
        code: '+20',
        patterns: [
            /^01[0-9]{9}$/, // Mobile: 01xxxxxxxxx (11 digits)
            /^0[2-8][0-9]{7,8}$/, // Landline: 0xx xxxxxxx (9-10 digits)
            /^\+201[0-9]{9}$/, // International mobile
            /^\+20[2-8][0-9]{7,8}$/ // International landline
        ],
        placeholder: '01xxxxxxxxx',
        description: 'Mobile: 11 digits, Landline: 9-10 digits'
    },
    'SA': {
        name: 'Saudi Arabia',
        code: '+966',
        patterns: [
            /^5[0-9]{8}$/, // Mobile: 5xxxxxxxx (9 digits)
            /^1[1-9][0-9]{7}$/, // Landline: 1x xxxxxxx (9 digits)
            /^\+9665[0-9]{8}$/, // International mobile
            /^\+9661[1-9][0-9]{7}$/ // International landline
        ],
        placeholder: '5xxxxxxxx',
        description: 'Mobile: 9 digits (5xxxxxxxx), Landline: 9 digits (1x xxxxxxx)'
    },
    'AE': {
        name: 'UAE',
        code: '+971',
        patterns: [
            /^5[0-9]{8}$/, // Mobile: 5xxxxxxxx (9 digits)
            /^[2-7][0-9]{7}$/, // Landline: x xxxxxxx (8 digits)
            /^\+9715[0-9]{8}$/, // International mobile
            /^\+971[2-7][0-9]{7}$/ // International landline
        ],
        placeholder: '5xxxxxxxx',
        description: 'Mobile: 9 digits (5xxxxxxxx), Landline: 8 digits (x xxxxxxx)'
    }
};

function testPhoneValidation(country, phoneNumber) {
    const rules = phoneValidationRules[country];
    if (!rules) {
        console.log(`❌ Country ${country} not found`);
        return false;
    }
    
    const isValid = rules.patterns.some(pattern => pattern.test(phoneNumber));
    console.log(`${isValid ? '✅' : '❌'} ${country} - ${phoneNumber}: ${isValid ? 'Valid' : 'Invalid'} (${rules.description})`);
    return isValid;
}

console.log('🧪 Testing Middle East Phone Number Validation\n');

// Test Egypt
console.log('🇪🇬 Egypt Tests:');
testPhoneValidation('EG', '01234567890'); // Valid mobile
testPhoneValidation('EG', '0123456789'); // Invalid (too short)
testPhoneValidation('EG', '0223456789'); // Valid landline
testPhoneValidation('EG', '+201234567890'); // Valid international mobile

console.log('\n🇸🇦 Saudi Arabia Tests:');
testPhoneValidation('SA', '512345678'); // Valid mobile
testPhoneValidation('SA', '51234567'); // Invalid (too short)
testPhoneValidation('SA', '112345678'); // Valid landline
testPhoneValidation('SA', '+966512345678'); // Valid international mobile

console.log('\n🇦🇪 UAE Tests:');
testPhoneValidation('AE', '512345678'); // Valid mobile
testPhoneValidation('AE', '51234567'); // Invalid (too short)
testPhoneValidation('AE', '21234567'); // Valid landline
testPhoneValidation('AE', '+971512345678'); // Valid international mobile

console.log('\n✅ Test completed!');
