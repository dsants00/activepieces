import { TriggerStrategy } from "@activepieces/shared";
import { AuthenticationType, createTrigger, DedupeStrategy, httpClient, HttpMethod, Polling, pollingHelper, Property } from "@activepieces/framework";

const markdownProperty = `
**Organization**: The organization name can be found in the URL (e.g https://ORGANIZATION_NAME.zendesk.com).

**Agent Email**: The email you use to log in to Zendesk.

**API Token**: You can find this in the Zendesk Admin Panel under Settings > APIs > Zendesk API.
`

export const newTicketInView = createTrigger({
    name: 'new_ticket_in_view',
    displayName: 'New ticket in view',
    description: 'Triggers when a new ticket is created in a view',
    type: TriggerStrategy.POLLING,
    props: {
        authentication: Property.CustomAuth({
            displayName: 'Authentication',
            description: markdownProperty,
            props: {
                email: Property.ShortText({
                    displayName: 'Agent Email',
                    description: 'The email address you use to login to Zendesk',
                    required: true,
                }),
                token: Property.ShortText({
                    displayName: 'Token',
                    description: 'The API token you can generate in Zendesk',
                    required: true,
                }),
                subdomain: Property.ShortText({
                    displayName: 'Organization (e.g activepieceshelp)',
                    description: 'The subdomain of your Zendesk instance',
                    required: true,
                }),
            },
            required: true,
        }),
        view_id: Property.Dropdown({
            displayName: 'View',
            description: 'The view to monitor for new tickets',
            refreshers: ['authentication'],
            required: true,
            options: async (value) => {
                const authentication = value['authentication'] as AuthProps;
                if (!authentication?.['email'] || !authentication?.['subdomain'] || !authentication?.['token']) {
                    return {
                        placeholder: 'Fill your subdomain and authentication first',
                        disabled: true,
                        options: [],
                    }
                }
                const response = await httpClient.sendRequest<{ views: any[] }>({
                    url: `https://${authentication.subdomain}.zendesk.com/api/v2/views.json`,
                    method: HttpMethod.GET,
                    authentication: {
                        type: AuthenticationType.BASIC,
                        username: authentication.email + "/token",
                        password: authentication.token,
                    }
                })
                return {
                    placeholder: 'Select a view',
                    options: response.body.views.map((view: any) => ({
                        label: view.title,
                        value: view.id,
                    }))
                }
            }
        })

    },
    sampleData: {
        "url": "https://activepieceshelp.zendesk.com/api/v2/tickets/5.json",
        "id": 5,
        "external_id": null,
        "via": {
            "channel": "web",
            "source": {
                "from": {},
                "to": {},
                "rel": null
            }
        },
        "created_at": "2023-03-25T02:39:41Z",
        "updated_at": "2023-03-25T02:39:41Z",
        "type": null,
        "subject": "Subject",
        "raw_subject": "Raw Subject",
        "description": "Description",
        "priority": null,
        "status": "open",
        "recipient": null,
        "requester_id": 8193592318236,
        "submitter_id": 8193592318236,
        "assignee_id": 8193592318236,
        "organization_id": 8193599387420,
        "group_id": 8193569448092,
        "collaborator_ids": [],
        "follower_ids": [],
        "email_cc_ids": [],
        "forum_topic_id": null,
        "problem_id": null,
        "has_incidents": false,
        "is_public": true,
        "due_at": null,
        "tags": [],
        "custom_fields": [],
        "satisfaction_rating": null,
        "sharing_agreement_ids": [],
        "custom_status_id": 8193592472348,
        "fields": [],
        "followup_ids": [],
        "ticket_form_id": 8193569410076,
        "brand_id": 8193583542300,
        "allow_channelback": false,
        "allow_attachments": true,
        "from_messaging_channel": false
    },
    onEnable: async (context) => {
        await pollingHelper.onEnable(polling, {
            store: context.store,
            propsValue: context.propsValue,
        })
    },
    onDisable: async (context) => {
        await pollingHelper.onDisable(polling, {
            store: context.store,
            propsValue: context.propsValue,
        })
    },
    run: async (context) => {
        return await pollingHelper.poll(polling, {
            store: context.store,
            propsValue: context.propsValue,
        });
    },
    test: async (context) => {
        return await pollingHelper.poll(polling, {
            store: context.store,
            propsValue: context.propsValue,
        });
    }
});

type AuthProps = {
    email: string;
    token: string;
    subdomain: string;
}

const polling: Polling<{ authentication: AuthProps, view_id: string }> = {
    strategy: DedupeStrategy.LAST_ITEM,
    items: async ({ propsValue }) => {
        const items = await getTickets(propsValue.authentication, propsValue.view_id);
        return items.map((item) => ({
            id: item.id,
            data: item,
        }));
    }
}

async function getTickets(authentication: AuthProps, view_id: string) {
    const { email, token, subdomain } = authentication;
    const response = await httpClient.sendRequest<{ tickets: any[] }>({
        url: `https://${subdomain}.zendesk.com/api/v2/views/${view_id}/tickets.json?sort_order=desc&sort_by=created_at&per_page=200`,
        method: HttpMethod.GET,
        authentication: {
            type: AuthenticationType.BASIC,
            username: email + "/token",
            password: token,
        }
    })
    return response.body.tickets;
}