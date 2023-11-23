/**
 * Welcome to Cloudflare Workers! This is flag display worker.
 */

import { parse } from "cookie";

export default {
	async fetch(request, env, ctx) {
		function nvl(str, defaultStr){
		
			if(typeof str == "undefined" || str == null || str == "")
				str = defaultStr ;
			
			return str ;
		}

		/**
 		 * Parse and decode a JWT.
 		 * A JWT is three, base64 encoded, strings concatenated with ‘.’:
 		 *   a header, a payload, and the signature.
 		 * The signature is “URL safe”, in that ‘/+’ characters have been replaced by ‘_-’
 		 * 
 		 * Steps:
 		 * 1. Split the token at the ‘.’ character
 		 * 2. Base64 decode the individual parts
 		 * 3. Retain the raw Bas64 encoded strings to verify the signature
 		 */
		function decodeJwt(token) {
			const parts = token.split('.');
			const header = JSON.parse(atob(parts[0]));
			const payload = JSON.parse(atob(parts[1]));
			const signature = atob(parts[2].replace(/_/g, '/').replace(/-/g, '+'));
			console.log(header)
			return {
			  header: header,
			  payload: payload,
			  // signature: signature,
			}
  		}
		
		/* handle flag image request */
		const { pathname } = new URL(request.url);
		const segments = pathname.split('/');

		// Return the last segment in the array
		const resource = segments[segments.length - 1];

		if (resource != null && resource != "" ) {
			/* get flag image from R2 */
			const fileName = resource.toLowerCase();
			// request.cf.country.toLowerCase() + ".png"
			const object = await env.countryflags.get(fileName);

			if (object === null) {
				// html_content += "<p>" + fileName + " not found</p>";
				return new Response(`Flag image ${fileName} not found.`, {
					status: 404,
				  });
			} else {
				// html_content += "<p>" + fileName + ": " + typeof object.body + " *";
				return new Response(object.body, {
					headers: {
						"content-type": "image/png",
					}
				})
		  	}
		}


		/* "/secure/ handling */
		const timezone = request.cf.timezone;
		let current_time = new Date().toLocaleString("en-US", { timeZone: timezone })
		
    	// The name of the authorization cookie
    	const COOKIE_NAME = "CF_Authorization";
    	const cookie = parse(request.headers.get("Cookie") || "");

		let auth_cookie = "";
		let auth_email = "No Auth ID"
		let auth_iat = "N/A"
		let auth_exp = "N/A"

		// get JWT in authorization cookie
    	if (cookie[COOKIE_NAME] != null) {
			const decoded = decodeJwt(cookie[COOKIE_NAME]);
			if ( decoded.payload.email !== undefined) {
				auth_email = decoded.payload.email
			}
			if ( decoded.payload.iat !== undefined) {
				auth_iat = new Date(decoded.payload.iat * 1000).toLocaleString("en-US", { timeZone: timezone })
			}
			if ( decoded.payload.exp !== undefined) {
				auth_exp = new Date(decoded.payload.exp * 1000).toLocaleString("en-US", { timeZone: timezone })
			}
		
			/* cookies information */
			auth_cookie += JSON.stringify(decoded)
		}

		/* Build html */
		let html_content = "";
		let html_style =
			"body{padding:6em; font-family: sans-serif;} h1{color:#f6821f;}";

		let html = `<!DOCTYPE html>
			<head>
			  <title>National Flag </title>
			  <style> ${html_style} </style> 
			</head>
			<body>
			  <h1>National Flag Demo</h1>
			  <p>${auth_email} authenticated at ${auth_iat}, expire at ${auth_exp}</p>
			  Access from <a href="./${request.cf.country}.png">${request.cf.country}</a>.</p>
			  <p>Current time is ${current_time}</p>
			  ${html_content}
			  <h1>CF_Authorization / Cookie</h1>
			  ${auth_cookie}
			</body>`;
  
		return new Response(html, {
			headers: {
			"content-type": "text/html;charset=UTF-8",
			},
		});
	},
};