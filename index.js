//Import dependencies
import {
	// AutojoinRoomsMixin,
	MatrixClient,
	SimpleFsStorageProvider,
	RichRepliesPreprocessor,
	AutojoinRoomsMixin,
} from "matrix-bot-sdk";
import { readFileSync } from "node:fs";
import { parse } from "yaml";

//Parse YAML configuration file
const loginFile = readFileSync("./db/login.yaml", "utf-8");
const loginParsed = parse(loginFile);
const homeserver = loginParsed["homeserver-url"];
const accessToken = loginParsed["login-token"];

//the bot sync something idk bro it was here in the example so i dont touch it ;-;
const storage = new SimpleFsStorageProvider("bot.json");

//login to client
const client = new MatrixClient(homeserver, accessToken, storage);
AutojoinRoomsMixin.setupOnClient(client);

//do not include replied message in message
client.addPreprocessor(new RichRepliesPreprocessor(false));

const filter = {
	//dont expect any presence from m.org, but in the case presence shows up its irrelevant to this bot
	presence: { senders: [] },
	room: {
		//ephemeral events are never used in this bot, are mostly inconsequentail and irrelevant
		ephemeral: { senders: [] },
		//we fetch state manually later, hopefully with better load balancing
		state: {
			senders: [],
			types: [],
			lazy_load_members: true,
		},
		//we will manually fetch events anyways, this is just limiting how much backfill bot gets as to not
		//respond to events far out of view
		timeline: {
			limit: 25,
		},
	},
};

const roomMatch = /[#!][^@/:]+:[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

//Start Client
client.start(filter).then(async (filter) => {
	console.log("Client started!");
});

//when the client recieves an event
client.on("room.event", async (roomID, event) => {
	//all the checks
	if (
		(event?.content?.body.split(" ").some((w) => roomMatch.test(w)) ||
			event?.content?.formatted_body
				.split(" ")
				.some((w) => roomMatch.test(w))) &&
		!(await client.userHasPowerLevelForAction(event.sender, roomID, "ban"))
	) {
		client
			.redactEvent(roomID, event.event_id, "Room links are not allowed here.")
			.catch((e) => {
				console.log(`unable to redact in ${roomID}, with error \n${e}`);
			});
	}
});
