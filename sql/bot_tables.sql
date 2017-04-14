create table bots(
  	id uuid primary key,
  	model_id uuid references models(id),
    language_code varchar(2) references languages(code) not null,
    name varchar(128),
    description varchar(1000),
    public_address varchar(1000),
    token varchar(1000)
);

create table actions(
    id uuid primary key,
    name varchar(128)
);

create table action_fulfillments(
    id uuid primary key,
    action_id uuid references actions(id) not null,
    bot_id uuid references bots(id) not null,
    url varchar(1000)
);

create table messages(
    id uuid primary key,
    placeholder varchar(2000)
 );

create table action_mappings(
  	id uuid primary key,
    model_id uuid references models(id) not null,
    request uuid references messages(id) not null,
    action_id uuid references actions(id),
    response uuid references messages(id)
);

create index action_mappings_model_id on action_mappings(model_id);

create table message_translations(
    message_id uuid references messages(id),
    language_code varchar(2) references languages(code) not null,
    text varchar(2000),
    primary key (message_id, language_code)
);