const db = require('./db');

module.exports.responseQuery = 'SELECT am.action_id as actionId, a.name as actionName, af.url as actionUrl, rest.text as text, ap.id as paramId, misst.text as paramMissingMsg ' +
    ' FROM BOTS b JOIN MODELS m on b.model_id = m.id ' +
    ' join ACTION_MAPPINGS am on am.model_id = m.id ' +
    ' left join ACTIONS a on a.id = am.action_id ' +
    ' left join ACTION_FULFILLMENTS af on af.action_id = a.id ' +
    ' left join ACTION_PARAMS ap on ap.action_id = a.id ' +
    ' join MESSAGES req on am.request = req.id ' +
    ' left join MESSAGES res on am.response = res.id ' +
    ' join MESSAGE_TRANSLATIONS reqt on reqt.message_id = req.id and reqt.language_code = b.language_code ' +
    ' left join MESSAGE_TRANSLATIONS rest on rest.message_id = res.id and rest.language_code = b.language_code ' +
    ' left join MESSAGE_TRANSLATIONS misst on misst.message_id = ap.msg_if_missing and misst.language_code = b.language_code ' +
    ' where b.id = $1 and reqt.text = $2';