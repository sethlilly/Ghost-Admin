/* eslint-disable camelcase */
import $ from 'jquery';
import {Response} from 'ember-cli-mirage';
import {isBlank} from '@ember/utils';

export default function mockAuthentication(server) {
    server.post('/authentication/token', function ({roles, users}, {requestBody}) {
        let params = $.deparam(requestBody);

        if (params.grant_type === 'authorization_code') {
            // OAuth sign-in
            if (!users.all().models.length) {
                let role = roles.findBy({name: 'Owner'});
                server.create('user', {email: 'oauthtest@example.com', roles: [role]});
            }

            return {
                access_token: 'MirageAccessToken',
                expires_in: 172800,
                refresh_token: 'MirageRefreshToken'
            };
        } else {
            // Password sign-in
            return {
                access_token: 'MirageAccessToken',
                expires_in: 172800,
                refresh_token: 'MirageRefreshToken',
                token_type: 'Bearer'
            };
        }
    });

    server.post('/authentication/passwordreset', function (schema, request) {
        let {passwordreset} = JSON.parse(request.requestBody);
        // eslint-disable-next-line ember-suave/prefer-destructuring
        let email = passwordreset[0].email;

        if (email === 'unknown@example.com') {
            return new Response(404, {}, {
                errors: [
                    {
                        message: 'There is no user with that email address.',
                        errorType: 'NotFoundError'
                    }
                ]
            });
        } else {
            return {
                passwordreset: [
                    {message: 'Check your email for further instructions.'}
                ]
            };
        }
    });

    server.get('/authentication/invitation/', function (schema, request) {
        let {email} = request.queryParams;
        let invite = schema.invites.findBy({email});
        let user = schema.users.find(invite.createdBy);
        let valid = !!invite;
        let invitedBy = user && user.name;

        return {
            invitation: [{
                valid,
                invitedBy
            }]
        };
    });

    /* Setup ---------------------------------------------------------------- */

    server.post('/authentication/setup', function ({roles, users}, request) {
        let [attrs] = JSON.parse(request.requestBody).setup;
        let role = roles.findBy({name: 'Owner'});

        // create owner role unless already exists
        if (!role) {
            role = roles.create({name: 'Owner'});
        }
        attrs.roles = [role];

        if (!isBlank(attrs.email)) {
            attrs.slug = attrs.email.split('@')[0].dasherize();
        }

        // NOTE: server does not use the user factory to fill in blank fields
        return users.create(attrs);
    });

    server.get('/authentication/setup/', function () {
        return {
            setup: [
                {status: true}
            ]
        };
    });
}
