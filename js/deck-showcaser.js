$(document).ready(function() {
	var input_card = $("#input-card");
	var btn = $( "#input-card .load-deck-btn" );
	var input = $( "#input-card #input" );
	var result = $( "#result-card #result-body" );
	var statistics = $("#result-card #statistics-body");

	$("#result-card").hide();
	$("#loading-notification").hide();
	statistics.collapse("hide");

	input.focus(function() {
		input.select();
		input.removeClass("loaded");
	});

	var options = {
		"resolution": "1", // 0=low, 1=normal (default: 1)
		"auto-split": "1", // 0=no, 1=yes (default: 1)
		"fullscreen-img": "0" // 0=no, 1=yes (default:0)
	};

	window.showcaserOption = function(k,v) {
		options[k] = v;
	}

	function resizeFakeCards() {
		$(".fake-card").each(function() {
			var that = $(this);
			var width = that.parent().parent().width();
			that.css("height",(width*1.25)+"px");
		});
	}
	$(window).resize(resizeFakeCards);

	// Clears all visible cards, resets the columns, and returns them
	function resetResults() {
		result.empty();
		statistics.empty();
		statistics.collapse("hide");
		var row = $("<div class='mtg-row'></div>");
		var creatures = $("<div class='mtg-col'><strong>Creatures</strong><div class='mtg-list'></div></div>");
		var noncreatures = $("<div class='mtg-col'><strong>Non-creatures</strong><div class='mtg-list'></div></div>");
		var lands = $("<div class='mtg-col'><strong>Lands</strong><div class='mtg-list'></div></div>");
		var sideboard = $( "<div class='mtg-col'><strong>Sideboard</strong><div class='mtg-list'></div></div>");
		var columns = { "creatures":$(".mtg-list",creatures),"noncreatures":$(".mtg-list",noncreatures),
						"lands":$(".mtg-list",lands),"sideboard":$(".mtg-list",sideboard)};
		row.append([creatures,noncreatures,lands,sideboard]);
		result.append(row);

		return columns;
	}

	// Fill text box
	function buildCardInputBox( cards ) {
		var cards_list = [];
		var sideboard_list = [];

		// first extract amount, name, and set
		$.each(cards,function(category,_cards) {
			var list = cards_list;
			if (category == "sideboard") {list = sideboard_list;}
			$.each(_cards,function(index,card) {
				list.push({amount:card.amount,name:card.name,'set':card.set});
			});
		});

		// Sort by card amount, or alphabetically if they're the same
		function sort_func(a,b) {
			if (a.amount == b.amount) {
				return a.name.localeCompare(b.name);
			}
			return (a.amount < b.amount) ? -1 : 1;
		}
		cards_list.sort(sort_func);
		sideboard_list.sort(sort_func);

		// convert into string
		function appendCards(list) {
			var ret = [];
			$.each(list,function(idx,card) {
				ret.push(card.amount + " " + card.name + " (" + card.set + ")");
			});
			return ret.join("\n");
		}

		var cards_str = appendCards(cards_list);
		if (sideboard_list.length > 0) {
			cards_str += "\n\n" + appendCards(sideboard_list);
		}

		input.val(cards_str);
	}

	// Build share URL
	var SHARE_URL_VERSION = 1;
	function buildShareURL( cards ) {
		var cards_list = [];
		var sideboard_list = [];

		// first extract multiverseid and amount
		$.each(cards,function(category,_cards) {
			var list = cards_list;
			if (category == "sideboard") {list = sideboard_list;}

			$.each(_cards,function(index,card) {
				if (typeof card.multiverseid != "undefined") {
					list.push({
						amount:parseInt(card.amount),
						multiverseid:card.multiverseid
					});
				}
			});
		});

		// Sort by card amount
		function sort_func(a,b) {
			if (a.amount == b.amount) {return 0;}
			return (a.amount < b.amount) ? -1 : 1;
		}
		cards_list.sort(sort_func);
		sideboard_list.sort(sort_func);

		var query_list = [];

		function appendCards(list) {
			var special_chars = ["","a","b","c","d"]; // a=1,b=2,c=3,d=4 cards
			var last_amount = 1;
			$.each(list,function(idx,card) {
				// if the card amount changes, insert a special character as long as amount <= 4, or else insert the literal amount
				if (card.amount <= 4) {
					if (card.amount != last_amount) {
						query_list.push(special_chars[card.amount]);
						last_amount = card.amount;
					}
				} else {
					if (last_amount != 0) {
						query_list.push("n"); // n="normal", count each card individually
						last_amount = 0;
					}
					query_list.push(card.amount);
				}

				query_list.push(card.multiverseid);
			});
		}

		appendCards(cards_list);

		var query_string = query_list.join(",");

		if (sideboard_list.length > 0) {
			query_list = [];
			appendCards(sideboard_list);
			query_string += "s" + query_list.join(","); // s="sideboard"
		}

		// Always insert the version first
		query_string = SHARE_URL_VERSION + query_string;
		location.hash = LZString.compressToEncodedURIComponent(query_string);
	}

	// Displays cards
	function displayCards( cards ) {
		var columns = resetResults();

		var all_amount = 0;
		$.each(cards,function(card_category,_cards) {
			var total_amount = 0;

			_cards.sort(function(a,b) {
				if (a.cmc == b.cmc) {
					// if cmc is the same, sort by name
					return a.name.localeCompare(b.name);
				}
				return a.cmc < b.cmc ? -1 : 1;
			});

			var parent = columns[card_category];
			var num_child = 0;

			$.each(_cards,function(idx,card) {
				var amount = card.amount;
				total_amount += amount;

				if (amount > 4) {
					parent.append(card.a);
					card.a.append($("<div class='card-counter'>" + amount + "x</div>").hide()).attr("data-card-amount",amount);
					num_child++;
				} else {
					for(var i=0;i<amount;i++) {
						parent.append(card.a.clone(true).attr("data-card-amount",1));
						num_child++;
					}
				}
			});

			if (card_category != "sideboard") {
				all_amount += total_amount;
			}
			var that = $("strong",parent.parent());
			that.html(that.text() + " (<span class='mtg-list-amount'>" + total_amount + "</span>)");
		});

		// Automatically split columns up if they're too tall
		// Also checks if columns are empty and hides them
		if (options["auto-split"] == "1") {
			var split_count = all_amount / 5; // if a column is this large, attempt split
			var min_split_count = 6; // only split if the resulting column has at least this many cards
			$.each(columns,function(card_category,pnl) {
				var children = pnl.children();
				var child_count = children.length;

				if (child_count == 0) {
					pnl.parent().hide();
					return;
				}

				if (child_count > split_count) {
					var new_pnl = pnl.parent().clone();
					$(".mtg-list",new_pnl).empty();
					var move_children = [];
					var actual_amount = 0;
					var previous_url = "";
					for(var i=0;i<child_count;i++) {
						let child = $(children[i]);
						if (i>Math.floor(child_count/2) && child.attr("href") != previous_url) {
							move_children.push(child[0]);
							actual_amount += parseInt(child.attr("data-card-amount"));
						} else {
							previous_url = child.attr("href");
						}
					}

					if (move_children.length > min_split_count) {
						$(move_children).detach().appendTo($(".mtg-list",new_pnl));
						new_pnl.insertAfter(pnl.parent());
						var temp = $(".mtg-list-amount",pnl.parent());
						temp.text(parseInt(temp.text()) - actual_amount);
						$(".mtg-list-amount",new_pnl).text(actual_amount);
					}
				}
			});
		} else {
			// splitting is disabled, so just check child count
			$.each(columns,function(card_category,pnl) {
				var children = pnl.children();
				var child_count = children.length;

				if (child_count == 0) {
					pnl.parent().hide();
					return;
				}
			});
		}

		var statistics_btn = $("<div class='btn btn-primary'>Deck statistics</div>");
		statistics_btn.click(function() {statistics.parent().collapse("toggle");});
		var totalnr = $("<div>").text("Nr of cards: " + all_amount);
		totalnr.css({
			padding:"6px",
			border:"1px solid rgba(0,0,0,0.125)",
			borderRadius:"0.25rem",
			display:"inline-block",
			marginRight:"15px",
			verticalAlign:"middle"
		});
		displayStatistics(cards);
		result.prepend([
			totalnr,
			statistics_btn,
			"<br>"
		]);

		function showImg(that) {
			$(".card-counter",that.parent()).show();
			$(".fake-card",that.parent()).remove();
			if (!that.hasClass("secondary-card")) {
				that.show();
			}
		}

		$("img",result).on("load", function() {
			showImg($(this));
		}).each(function() {
			if(this.complete) {
				showImg($(this));
			} else {
				var parent = $(this).parent();
				if (parent.is(":first-child")) {
					parent.append("<div class='fake-card'></div>"); // insert fake card
				}
			}
		});

		result.parent().collapse("show");
		$("#result-card").show();
		$("#loading-notification").hide();
		resizeFakeCards();
		setTimeout(function() {resizeFakeCards();},200);
	}

	// returns {image:<string>,border_class:<string>}
	function getCardImage(card) {
		var res = (options.resolution == "1") // true=normal res, false=low res
		var normal_img = (res ? "border_crop" : "small");
		var backup_img = (res ? "normal" : "small");

		var image = "";
		var hires_image = "";
		var fix_border_class = "";
		var multi_images = {split:true, flip:true, transform:true, double_faced_token:true};
		if (multi_images[card.layout]) {
			if (card.card_faces[0].image_uris) {
				hires_image = card.card_faces[0].large;

				if (card.card_faces[0].image_uris[normal_img]) {
					image = card.card_faces[0].image_uris[normal_img];
					fix_border_class = (normal_img=="border_crop" ? "fix-border" : "");
				} else {
					image = card.card_faces[0].image_uris[backup_img];
				}
			}
		}

		if (image == "") {
			if (card.image_uris) {
				hires_image = card.image_uris.large;

				if (card.image_uris[normal_img]) {
					image = card.image_uris[normal_img];
					fix_border_class = (normal_img=="border_crop" ? "fix-border" : "");
				} else {
					image = card.image_uris[backup_img];
				}
			}
		}

		return {image:image,border_class:fix_border_class,hires_image:hires_image};
	}

	var symbol_colors = {
		"{W}": scryfall_symbology["{W}"],
		"{U}": scryfall_symbology["{U}"],
		"{B}": scryfall_symbology["{B}"],
		"{R}": scryfall_symbology["{R}"],
		"{G}": scryfall_symbology["{G}"],
		"{S}": scryfall_symbology["{S}"],
		"multicolored": {svg_uri: "multicolored.png"}, // custom icon for multicolored
		"lands": {svg_uri: "lands.png"} // custom icon for lands
	};

	function displayStatistics(cards) {
		var col1 = $("<div class='col-4'>");
		var col2 = $("<div class='col-3'>");
		var col3 = $("<div class='col-5'>");
		var row = $("<div class='row'>");
		statistics.append(row.append([col1,col2,col3]));

		// Mana curve
		col1.append("<center><strong>Mana curve</strong></center>");
		var ch = $("<canvas style='width:100%; height:200px; max-width:400px;'>");
		col1.append(ch);

		function roundPrice(p) {return Math.floor(p*10000+0.5)/10000;}

		var data = {creatures:[0,0,0,0,0,0],noncreatures:[0,0,0,0,0,0]};
		var manadist = {};
		var typelist = {};
		var pricelist = [];
		var total_price = {usd:0,eur:0};
		function parseManadist(card) {
			var m = card.mana_cost.match(/\{.+?\}/g);
			var already_added = {};
			var multicolored = false;

			for(let i=0;i<m.length;i++) {
				let cost = m[i];

				if (typeof scryfall_symbology[cost]) {
					let symbol = scryfall_symbology[cost];
					if (symbol.colors) {
						for(let x=0;x<symbol.colors.length;x++) {
							let c = "{"+symbol.colors[x]+"}";
							if (typeof already_added[c] == "boolean") {continue;}

							manadist[c] = (manadist[c] || 0) + card.amount;
							already_added[c] = true;

							if (multicolored) {
								manadist["multicolored"] = (manadist["multicolored"] || 0) + card.amount;
							}
							multicolored = true;
						}
					}
				}
			}
		}


		function parseSubtypes(card) {
			function parseLine(line) {
				var type = false;
				var subtypes = false;
				if (line.indexOf("—") != -1) {
					var m = line.match(/^(.+) — (.+)$/);
					type = m[1];
					subtypes = m[2];
				} else {
					type = line;
				}


				if (type != false) {
					type = type.replace("Legendary ",""); // We don't care about legendary here
					type = type.replace("Basic Land","Land"); // We don't care about basic  here
					
					var expl = type.split(" ");
					for(let i=0;i<expl.length;i++) {
						let t = expl[i];
						if (typeof typelist[t] == "undefined") {typelist[t] = {amount:0,subtypes:{}};}
						typelist[t].amount+=card.amount;
					}

					// assume that the last type in the list is the most relevant one (such as in 'Enchantment Creature')
					type = expl.pop();
				}
				
				if (subtypes != false) {
					var tp = typelist[type];
					var expl = subtypes.split(" ");
					for(let i=0;i<expl.length;i++) {
						let subtype = expl[i];
						tp.subtypes[subtype] = (tp.subtypes[subtype] || 0) + card.amount;
					}
				}
			}

			if (card.type_line.indexOf("//") != -1) {
				var m = card.type_line.match(/^(.+) \/\/ (.+)$/);
				parseLine(m[1]);
				parseLine(m[2]);
			} else {
				parseLine(card.type_line);
			}
		}

		var total_nonland = 0;
		$.each(cards,function(card_category,_cards) {
			$.each(_cards,function(idx,card) {
				// Typelist
				parseSubtypes(card);

				total_price.eur += roundPrice(card.prices.eur * card.amount);
				total_price.usd += roundPrice(card.prices.usd * card.amount);
				pricelist.push({
					name: $("<div>").append([
						$("<a>").attr("href",card.url).text(card.name),
						" " + (card.amount > 1 ? "x"+card.amount : "")
					]),
					eur: roundPrice(card.prices.eur * card.amount) + "€",
					usd: roundPrice(card.prices.usd * card.amount) + "$",
					card: card
				});

				if (card_category == "lands") {
					manadist["lands"] = (manadist["lands"] || 0) + card.amount;
				} else {
					// Insert into mana curve list
					if (card.cmc <= 1) {
						data[card_category][0] += card.amount;
					} else if (card.cmc >= 6) {
						data[card_category][5] += card.amount;
					} else {
						data[card_category][card.cmc-1] += card.amount;
					}
					
					// Mana distribution
					parseManadist(card);

					total_nonland += card.amount;
				}
			});
		});

		var chart = new Chart(ch[0].getContext("2d"),{
			type: "bar",
			data: {
				labels: ["CMC: 1-","2","3","4","5","6+"],
				datasets:[{
					label: "Creatures",
					data: data.creatures,
					backgroundColor: ["#fd7e14","#fd7e14","#fd7e14","#fd7e14","#fd7e14","#fd7e14"]
				},{
					label: "Noncreatures",
					data: data.noncreatures,
					backgroundColor: ["#007bff","#007bff","#007bff","#007bff","#007bff","#007bff"]
				}]
			},
			options:{
				scales: {
					xAxes: [{stacked: true}],
					yAxes: [{stacked: true}]
				}
			}
		});

		// Mana distribution
		col1.append("<center><strong>Mana Distribution</strong></center>");
		var manadist_row = $("<div class='manadist-grid'>");
		$.each(symbol_colors,function(idx,symbol) {
			if (typeof manadist[idx] != "undefined") {
				let c = $("<center>");

				c.append($("<img>").attr("src",symbol.svg_uri));
				if (idx != "lands" && idx != "multicolored") {
					c.append($("<p>").html(manadist[idx] + "<br>" + Math.floor(manadist[idx] / total_nonland * 100 + 0.5) + "%"));
				} else {
					c.append($("<p>").html(manadist[idx]));
				}

				manadist_row.append($("<div class='manadist-grid-item'>").append(c));
			}
		});
		col1.append(manadist_row);

		// Type list
		col2.append("<center><strong>Card Type List</strong></center>");
		var order = {Creature:1,Instant:2,Sorcery:3,Enchantment:4,Planeswalker:5,default:6,Land:7};
		var typelists = [];
		$.each(typelist,function(idx,v) {
			v.name = idx;
			typelists.push(v);
		});
		typelists.sort(function(a,b) {
			var l = (order[a.name] || order.default);
			var r = (order[b.name] || order.default);
			if (l == r) {return 0;}
			return l > r ? 1 : -1;
		});
		for(let i=0;i<typelists.length;i++) {
			let item = typelists[i];
			let d = $("<div class='typelist-item link-pointer'>").append([
				$("<span>").text("[+] " + item.name),
				$("<div class='typelist-item-right'>").text(item.amount)
			]);
			col2.append(d);
			let collapse = $("<div class='collapse'>");
			let collapse_c = $("<div class='card card-body typelist-item-card'>");
			var has_items = false;
			$.each(item.subtypes,function(idx,v) {
				has_items = true;
				collapse_c.append($("<div class='typelist-item typelist-item-subtype'>").text(idx).append($("<div class='typelist-item-right'>").text(v)));
			});
			if (!has_items) {
				collapse.remove();
				collapse_c.remove();
				$("span",d).text(item.name);
				d.removeClass("link-pointer");
			} else {
				col2.append(collapse.append(collapse_c));
				d.click(function() {collapse.collapse("toggle");});
				collapse.on("show.bs.collapse",function() {$("span",d).text("[-] "+item.name);});
				collapse.on("hide.bs.collapse",function() {$("span",d).text("[+] "+item.name);});
			}
		}

		// Deck price
		pricelist.sort(function(a,b) {
			var l = a.card.prices.usd * a.card.amount;
			var r = b.card.prices.usd * b.card.amount;
			if (l == r) {
				return a.card.name.localeCompare(b.card.name)
			}

			return l < r ? 1 : -1;
		})
		col3.append("<center><string>Deck Price</strong></center>");
		var t = $("<table class='table table-striped'>");
		t.append("<thead><tr><th style='width:99%'>Name</th><th>Euro</th><th>USD</th></tr></thead>");
		var tb = $("<tbody>").appendTo(t);
		col3.append(t);
		var hidden_cards = 0;
		for(let i=0;i<pricelist.length;i++) {
			let tr = $("<tr>").append([
				$("<td>").css("text-align","left").append(pricelist[i].name),
				$("<td>").text(pricelist[i].eur),
				$("<td>").text(pricelist[i].usd),
			]);
			tb.append(tr);

			if (i < 10) {
				tr.addClass("show-more");
			} else {
				tr.addClass("show-less");
				tr.hide();
				hidden_cards+=pricelist[i].card.amount;
			}
		}
		var togglebtn = $("<div class='btn btn-primary'>").text("Show more").css("margin-left","8px");
		var tgl = false;
		togglebtn.click(function() {
			tgl = !tgl;
			if (tgl) {
				$("tr.show-less",tb).show();
				togglebtn.text("Show less");
				showmore_text.text("");
			} else {
				$("tr.show-less",tb).hide();
				togglebtn.text("Show more");
				showmore_text.text("+"+hidden_cards+" cards");
			}
		});
		tb.append($("<tr>").append([
			$("<th>").css("text-align","right").text("Sum:"),
			$("<td>").text(roundPrice(total_price.eur) + "€"),
			$("<td>").text(roundPrice(total_price.usd) + "$")
		]));
		var showmore_text = $("<span>").text("+"+hidden_cards+" cards");
		tb.append($("<tr>").append($("<td colspan='3'>").append([showmore_text,togglebtn])));
	}

	function processCard(card,cards,amount,in_sideboard) {
		var name = card.name;
		var type = card.type_line;
		var primary_image = getCardImage(card);
		var fix_border_class = primary_image.border_class;
		var hires_image = [];
		var image = primary_image.image;

		if (typeof image == "undefined") {
			alert("Warning: Card '" + card.name + "' doesn't have an image!");
		}

		var card_category = "creatures";
		if (in_sideboard) {
			card_category = "sideboard";
		} else {
			if (card.card_faces && card.card_faces[0].type_line) { // check 1st face of card
				if (card.card_faces[0].type_line.toLowerCase().indexOf("creature") == -1) {card_category = "noncreatures";}
			} else { // check main type line
				if (type.toLowerCase().indexOf("creature") == -1) {card_category = "noncreatures";}
			}

			if (card.card_faces && card.card_faces[0].type_line) { // check 1st face of card
				if (card.card_faces[0].type_line.toLowerCase().indexOf("land") != -1) {card_category = "lands";}
			} else { // check main type line
				if (type.toLowerCase().indexOf("land") != -1) {card_category = "lands";}
			}
		}

		//var card_url = "http://gatherer.wizards.com/Pages/Card/Details.aspx?multiverseid=" + card.multiverseid;
		var card_url = card.scryfall_uri;

		var a = $("<a target='_blank' href='"+card_url+"' class='mtg-card'></a>");

		if (typeof card.card_faces != "undefined") { // multiple faces, load all
			// add images for other faces
			var len = card.card_faces.length;
			for(var i=0;i<len;i++) {
				let m = getCardImage(card.card_faces[i]);
				if (m.image == "") { // no image was found, fall back to the base image and abort
					m.image = image;
					m.border_class = fix_border_class;
					len = -1; // abort after this
					hires_image = [primary_image.hires_image];
				} else {
					hires_image.push(m.hires_image);
				}

				let img_2 = $("<img>").attr("src",m.image).addClass(m.border_class);
				if (i>0) {img_2.addClass("secondary-card");}
				a.append(img_2);
			}
		} else { // just one face, load it
			var img = $("<img>").attr("src",image).addClass(fix_border_class);
			img.hide();
			a.append(img);

			hires_image = [primary_image.hires_image];
		}

		// handle hires image on hover
		var fs_im = $(".fullscreen-img");
		var fs_cont = $(".fullscreen-container",fs_im);
		a.on("mouseenter",function() {
			if (options["fullscreen-img"] == "1") {
				var c = fs_im.children();
				$(".fs-img",fs_im).hide(); // hide all <img> elements first
				$.each(hires_image,function(idx,elem) { // step through all faces of card and show images
					if (c[idx]) {
						// set src and show
						$("img",c[idx]).attr("src",elem);
						$(c[idx]).show();
					} else {
						// if <img> element doesn't exist yet, create it
						var e = $("<div class='fs-img'><img></div>");
						$("img",e).attr("src",elem);
						e.appendTo(fs_im); 
					}
				});

				// set image width by number of images
				//var percent = Math.min(90,(1/hires_image.length)*100);
				//$("img",fs_im).css("max-width",percent+"%");

				// show fullscreen images
				fs_im.show();
			}
		});
		a.on("mouseleave",function() {
			fs_im.hide();
		});

		if (typeof cards[card_category] == "undefined") {cards[card_category] = [];}
		cards[card_category].push({
			name: name,
			amount: amount,
			image: image,
			a: a,
			url: card_url,
			cmc: card.cmc,
			multiverseid:card.multiverse_ids[0],
			'set': card.set,
			prices: card.prices,
			mana_cost: card.mana_cost,
			type_line: card.type_line
		});
	}

	function loadCardsFromInput() {
		var txt = input.val().trim();
		var lines = txt.split("\n");

		var requests = {};
		var requests_sideboard = {};
		var found_cards = {};
		var error_parsing_deck = false;

		var in_sideboard = false;

		$.each(lines,function(row,line) {
			line = line.trim();

			if (line == "Deck") {return;}

			if (line == "" || line.toLowerCase().indexOf("sideboard") != -1) {
				in_sideboard = true;
				return;
			}

			try {
				var re = /^(\d*) (.*?) ?(?:\((.*)\))? ?(\w*?)$/i;
				var match = line.match(re);
 				var amount = parseInt(match[1]);
				var name = match[2];
				var set = match[3];
				var num = match[4];
 				if (!set) { // if no set is defined, then the name may be split up into name and num. join them back up
					name = (name + " " + num).trim()
					set = "*";
				}
				var set = match[3] || "*";

				// if the card is a basic land, and the set is undefined, change the set to UST because they look cool
				if (set == "*") {
					var basic_lands = {plains:true, island:true, swamp:true, mountain:true,forest:true};
					if (basic_lands[name.trim().toLowerCase()] == true) {
						set = "UST";
					}
				}

				/*
					note! this new regex doesn't work in firefox
					keeping it here in case it becomes available for use in the future
				var re = /^(\d*) (.*?) ?(?:\((.*)\))? ?(?:(?<=.*\)\s?)(\w*?))?$/i;
				var match = line.match(re);
				var amount = parseInt(match[1]);
				var name = match[2];
				var set = match[3] || "*";
				// var num = match[4]; // isn't used
				*/

				if (set == "DAR") {set = "DOM";} // Hopefully temporary, check back later, maybe erase
			} catch(e) {
				alert("Error parsing deck: " + e);
				error_parsing_deck = true;
				return false;
			}

			var r = requests;
			if (in_sideboard) {r = requests_sideboard;}

			if (typeof r[set] == "undefined") {
				r[set] = [];
			}

			if ((r[set].length == 0) ||
				r[set][0].names.length >= 100 || // the limit is 175 requests, but we're limiting ourselves to 100 to be safe
				r[set][0].names.join("").length + r[set][0].names.length*7 > 800) { // also limiting the url length to about 800 characters (nr of spaces=number of characters added below)
				r[set].unshift({
					names: [],
					amount_by_name: {}
				});
			}

			r[set][0].names.push(name);
			r[set][0].amount_by_name[name.toLowerCase()] = amount;
			found_cards[name.toLowerCase()] = false;
		});

		if (error_parsing_deck) {return;} // abort

		hideInput();
		$("#loading-notification").show();

		var cards = {};
		var num_requests = 0;
		var no_mid = [];
		var warned_about_fail = false;

		function processRequests(r, in_sideboard) {
			$.each(r,function(set,arr) {
				$.each(arr,function(idx,request) {
					var names = request.names;
					var amount_by_name = request.amount_by_name;

					var params = {};

					$.each(names,function(idx,name) {
						names[idx] = "!\"" + name + "\""; // Prefix each name with "!" and add quotes " " which makes it an exact match
					});

					params.q = names.join(" or ");

					if (set.indexOf("*") == -1) {
						params.q = "s:" + set + " (" + params.q + ")"; // Add set, and group all cards in brackets
					} 

					params.unique = "cards"; // Always find one copy of each card
					params.order = "released"; // Always sort by newest first
					params.dir = "asc";

					var request_string = $.param(params);
					var url = "https://api.scryfall.com/cards/search?" + request_string;

					num_requests++;
					var x = $.get( url, function(data) {
						$.each(data.data,function(idx,card) {
							//if (found_cards[card.name] == true) {return;}
							var name = card.name.toLowerCase();
							found_cards[name] = true;

							if (card.multiverse_ids.length == 0) {
								no_mid.push(card.name);
							}

							var amount = amount_by_name[name] || 0;

							// checks for other card faces
							if (amount == 0) {
								if (typeof card.card_faces != "undefined") {
									for(var i=0;i<card.card_faces.length;i++) {
										let face = card.card_faces[i];
										let face_name = face.name.toLowerCase();
										found_cards[face_name] = true;

										if (typeof amount_by_name[face_name] != "undefined") {
											amount = amount_by_name[face_name];
										}
									}
								}
							}

							processCard(card,cards,amount,in_sideboard);
						});
					});

					x.always(function() {
						num_requests--;

						if (num_requests == 0) {
							var not_found = [];
							$.each(found_cards,function(name,b) {
								if (b == false) {
									not_found.push(name);
								}
							});

							if (not_found.length > 0) {
								alert( "Card(s) '" + not_found.join("; ") + "' not found! It's possible the API hasn't been updated yet.");
							}

							if (no_mid.length > 0) {
								alert( "Card(s) '" + no_mid.join("; ") + "' have no multiverse IDs!\n"+
										"These cards cannot be encoded into the URL and will therefore not show up if you send the link to someone.\n"+
										"Try specifying a different set for these cards. Some reprints don't have multiverseids. It's also possible the API hasn't been updated yet." );
							}

							displayCards(cards);
							buildShareURL(cards);
						}
					});

					x.fail(function() {
						if (!warned_about_fail) {
							warned_about_fail = true;
							alert("Unable to contact scryfall's API. Maybe it's down? You could go check https://downforeveryoneorjustme.com/ to be sure.");
						}
					});
				});
			});
		}

		processRequests(requests,false);
		processRequests(requests_sideboard,true);
	}

	function loadCardsFromURL() {
		var txt = location.hash.substr(1);
		var decompressed = LZString.decompressFromEncodedURIComponent(txt);
		if (decompressed == "" || decompressed == null) {return;}

		// First character is always the version of the encoded string, extract it
		var version = decompressed.substr(0,1);
		// Currently there's only one version so no extra behavior is processed here, but could be in the future
		decompressed = decompressed.substr(1);

		// if the user is using an old version of an url, there might be a comma in the beginning, remove it
		if (decompressed.substr(0,1) == ",") {
			decompressed = decompressed.substr(1);
		}

		// first split by sideboard
		var split_sideboard = decompressed.split("s");

		function readData(str) {
			var requests = [[]];
			var amount_by_multiverseid = {};

			var split = str.split(",");
			if (split.length == 0) {return;}

			var special_chars = {"b":2,"c":3,"d":4};

			var current_amount = 1;
			var literal_amount = false;
			var literal_amount_step = false;
			$.each(split,function(idx,value) {
				if (value == "n") {
					literal_amount = true;
				} else if (typeof special_chars[value] != "undefined") {
					current_amount = special_chars[value];
				} else {
					value = parseInt(value);
					if (literal_amount) literal_amount_step = !literal_amount_step;

					if (literal_amount && literal_amount_step) {
						current_amount = value;
					} else {
						amount_by_multiverseid[value] = current_amount;

						if (requests[0].length >= 60) { // max is 75, limit to 60 to be safe
							requests.unshift([]);
						}

						requests[0].push(value);
					}
				}
			});

			return {requests:requests,amount_by_multiverseid:amount_by_multiverseid};
		}

		var requests = readData(split_sideboard[0]);
		var requests_sideboard;
		if (typeof split_sideboard[1] != "undefined") {
			requests_sideboard = readData(split_sideboard[1]);
		}

		hideInput();
		$("#loading-notification").show();
		var cards = {};
		var num_requests = 0;
		var fetched_cards = {};
		var warned_about_fail = false;

		function processRequests(requests,is_sideboard) {
			var req = requests.requests;
			var amount_by_multiverseid = requests.amount_by_multiverseid;

			$.each(req,function(idx,multiverseids) {
				num_requests++;

				var params = {};
				params.identifiers = [];
				$.each(multiverseids,function(idx,m_id) {
					params.identifiers.push({multiverse_id:m_id});
				});

				var url = "https://api.scryfall.com/cards/collection";
				var x = $.ajax({
					url:"https://api.scryfall.com/cards/collection",
					method:"POST",
					data:JSON.stringify(params),
					crossOrigin:true,
					contentType:"application/json",
					dataType:"json",
					xhrFields: {
						withCredentials: false
					},
					success: function(data){
						$.each(data.data,function(idx,card) {
							fetched_cards[card.name] = true;

							var amount = 1;
							for(var i=0;i<card.multiverse_ids.length;i++) {
								if (amount_by_multiverseid[card.multiverse_ids[i]]) {
									amount = amount_by_multiverseid[card.multiverse_ids[i]];
									break;
								}
							}

							processCard(card,cards,amount,is_sideboard);
						});
					}
				});

				x.always(function() {
					num_requests--;

					if (num_requests == 0) {
						displayCards(cards);
						buildCardInputBox(cards);
					}
				});

				x.fail(function() {
					if (!warned_about_fail) {
						warned_about_fail = true;
						alert("Unable to contact scryfall's API. Maybe it's down? You could go check https://downforeveryoneorjustme.com/ to be sure.");
					}
				});
			});
		}

		processRequests(requests,false);
		if (typeof requests_sideboard != "undefined") {
			processRequests(requests_sideboard,true);
		}
	}

	var btn_other_deck = $(".open-input-btn",input_card);
	function hideInput() {
		btn.hide();
		btn_other_deck.show();
		$(".collapse",input_card).not("#how-does-it-work-collapse").collapse("hide");
	}

	function showInput() {
		btn.show();
		btn_other_deck.hide();
		$(".collapse",input_card).not("#how-does-it-work-collapse").collapse("show");
	}

	var old_input_text = "";
	btn.click(function() {
		if (old_input_text == input.val()) {
			hideInput(); return;
		}
		old_input_text = input.val();

		loadCardsFromInput();
	});

	btn_other_deck.click(showInput);

	if (location.hash != "") {
		loadCardsFromURL();
	}
});
