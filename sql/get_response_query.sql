SELECT rest.text
FROM BOTS b JOIN MODELS m on b.model_id = m.id
join ACTION_MAPPINGS am on am.model_id = m.id
join MESSAGES req on am.request = req.id
join MESSAGES res on am.response = res.id
join MESSAGE_TRANSLATIONS reqt on reqt.message_id = req.id and reqt.language_code = b.language_code
join MESSAGE_TRANSLATIONS rest on rest.message_id = res.id and rest.language_code = b.language_code
where b.id = '11fdd276-193c-11e7-93ae-92361f002671' and reqt.text = 'status';
