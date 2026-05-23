var leif = (function(that){

	var fs = require("fs"),
		path = require("path"),
		parser = require("./leif.parse.js"),
		interpreter = require("./leif.interpret.js"),
		helper = require("./leif.helper.js"),
		tc = require("./leif.template.js"),

		registerDirectory,
		registerDirectorySync,
		registerTemplate,
		registerTemplateSync,
		getTemplatesByName,
		getTemplateByPath,
		parseTemplate,
		parseTemplateSync,
		cacheTemplate,
		cacheTemplateSync,
		cacheTemplateByName,
		cacheTemplateByNameSync,
		cacheTemplateByPath,
		cacheTemplateByPathSync,
		cacheAllTemplates,
		cacheAllTemplatesSync,
		interpretTemplate,
		requestTemplateByName,
		requestTemplateByPath,
		clearCache,
		clearRegister,

		views = {};


	//API

	that.overrideExistingTemplates = false;
	that.throwErrorOnOverrideExistingTemplates = true;
	that.returnFirstTemplateOnMultipleMatches = false;
	that.cacheTemplatesOnFirstRequest = true;

	that.registerDirectory = function (dir, callback) {
		registerDirectory(dir, "", function (err) {
			callback(err);
		});
	};

	that.registerDirectorySync = function (dir) {
		return registerDirectorySync(dir, "");
	};

	that.registerTemplate = function (file, callback) {
		registerTemplate(file, path.basename(file, path.extname(file)), function (err) {
			callback(err);
		});
	};

	that.registerTemplateSync = function (file) {
		return registerTemplateSync(file, path.basename(file, path.extname(file)));
	};	

	that.registerTemplateWithName = function (file, name, callback) {
		registerTemplate(file, name, function (err) {
			callback(err);
		});
	};

	that.registerTemplateWithNameSync = function (file, name) {
		return registerTemplateSync(file, name);
	};

	that.cacheTemplateByName = function (name, callback) {
		cacheTemplateByName(name, function (err) {
			callback(err);
		});
	};

	that.cacheTemplateByNameSync = function (name) {
		return cacheTemplateByNameSync(name);
	};

	that.cacheTemplateByPath = function (path, callback) {
		cacheTemplateByPath(path, function (err) {
			callback(err);
		});
	};

	that.cacheTemplateByPathSync = function (path) {
		return cacheTemplateByPathSync(path);
	};

	that.cacheAllTemplates = function (callback) {
		cacheAllTemplates(function (err) {
			callback(err);
		});
	};

	that.cacheAllTemplatesSync = function () {
		return cacheAllTemplatesSync();
	};

	that.requestTemplateByName = function (name, context) {
		return requestTemplateByName(name, context);
	};	

	that.requestTemplateByPath = function (path, context) {
		return requestTemplateByPath(path, context);
	};

	that.clearCache = function () {
		clearCache();
	};

	that.clearRegister = function () {
		clearRegister();
	};	

	that.setUserRepository = function (repo) {
		parser.setUserRepository(repo);
		interpreter.setUserRepository(repo);
	};

	that.__returnTemplates = function () {
		return helper.deepCopy(views);
	};


	//Functions

	registerDirectory = function (dir, templatePath, callback) {

		if (typeof templatePath !== "string") {
			templatePath = "";
		}	
		fs.stat(dir, function (err, stats) {
			var folderName;
			if (err) {
				callback(err);
			} else if (stats.isDirectory()) {
				folderName = path.basename(dir);
				templatePath += folderName + "/";
				fs.readdir(dir, function (err, files) {
					var file, i, max_i = files.length,
						totalError = "",
						counter = 0, incrementCounter;

					incrementCounter = function (error) {
						counter += 1;
						if (error instanceof Error) {
							error = error.message;
						}
						totalError += error ? error + "\r\n" : "";
						if (counter == max_i) {
							callback(totalError === "" ? null : new Error(totalError));
						}
					};
					for (i = 0; i < max_i; i++) {
						file = dir + "/" + files[i];
						(function (file) {
							fs.stat(file, function (err, stats) {
								var templateName,
									tpath;

								if (err) {
									incrementCounter(err);
								} else if (stats.isDirectory()) {
									registerDirectory(file, templatePath, function (err) {
										incrementCounter(err);
									});
								} else if (stats.isFile()) {
									if (path.extname(file) === ".html") {
										templateName = path.basename(file, '.html');
										tpath = templatePath + templateName;
										if (that.overrideExistingTemplates || !views[tpath]) {
											views[tpath] = tc.createTemplate(file, templateName);
											incrementCounter();
										} else if (that.throwErrorOnOverrideExistingTemplates) {
											incrementCounter("a template with the path " + tpath + " is already registered");
										} else {
											incrementCounter();
										}						
									} else {
										incrementCounter();
									}
								} else {
									incrementCounter();
								}
							});
						}(file));
					}
				});
			} else {
				callback(new Error(dir + " is not a directory"));
			}
		});
	};

	registerDirectorySync = function (dir, templatePath) {
		var dirStat,
			fileStat,
			folderName,
			files, file,
			subDirResult,
			data,
			templateName,
			tpath,
			error = "",
			i, max_i;

		if (typeof templatePath !== "string") {
			templatePath = "";
		}	

		dirStat = fs.statSync(dir);

		if (dirStat.isDirectory()) {
			folderName = path.basename(dir);
			templatePath += folderName + "/";
			files = fs.readdirSync(dir);
			for (i = 0, max_i = files.length; i < max_i; i++) {
				file = dir + "/" + files[i];
				fileStat = fs.statSync(file);
				if (fileStat.isDirectory()) {
					subDirResult = registerDirectorySync(file, templatePath);
					error += (subDirResult instanceof Error) ? subDirResult.message : "";
				} else if (fileStat.isFile()) {
					if (path.extname(file) === ".html") {
						templateName = path.basename(file, '.html');
						tpath = templatePath + templateName;
						if (that.overrideExistingTemplates || !views[tpath]) {
							views[tpath] = tc.createTemplate(file, templateName);
						} else if (that.throwErrorOnOverrideExistingTemplates) {
							error += "a template with the path " + tpath + " is already registered\r\n";
						}
					}
				}
			}
		} else {
			error += dir + " is not a directory\r\n";
		}
		return error === "" ? null : new Error(error);
	};	

	registerTemplate = function (file, name, callback) {
		fs.exists(file, function (exists) {
			if (exists) {
				if (that.overrideExistingTemplates || !views[name]) {
					views[name] = tc.createTemplate(file, name);
					callback(null);
				} else if (that.throwErrorOnOverrideExistingTemplates) {
					callback(new Error("a template with the path " + name + " is already registered"));
				} else {
					callback(null);
				}
			} else {
				callback(new Error("file " + file + " does not exist!"));
			}
		});	
	};

	registerTemplateSync = function (file, name) {
		var exists;

		exists = fs.existsSync(file);
		if (exists) {
			if (that.overrideExistingTemplates || !views[name]) {
				views[name] = tc.createTemplate(file, name);
				return null;
			} else if (that.throwErrorOnOverrideExistingTemplates) {
				return new Error( "a template with the path " + name + " is already registered");
			} else {
				return null;
			}
		} else {
			return new Error("file " + file + " does not exist!");
		}					
	};		

	getTemplatesByName = function (name) {
		var result = [],
			key, item;

		for (key in views) {
			if (views.hasOwnProperty(key)) {
				item = views[key];
				if (item.name === name) {
					result.push(item);
				}
			}
		}
		return result;
	};		

	getTemplateByPath = function (path) {
		var key;

		for (key in views) {
			if (views.hasOwnProperty(key) && key === path) {
				return views[key];
			}
		}
		return new Error("there is no template with the path " + path + " registered!");
	};

	parseTemplate = function (template, callback) {
		fs.readFile(template.file, function (error, data) {
			if (error) {
				callback(error);
			} else {
				callback(null, parser.parse(data.toString()));				
			}
		});
	};

	parseTemplateSync = function (template) {
		var data;

		data = fs.readFileSync(template.file);
		return parser.parse(data.toString());	
	};

	cacheTemplate = function (template, callback) {
		parseTemplate(template, function (error, cache) {
			if (error) {
				callback(error);
			} else {
				template.cache = cache;	
				callback(null);				
			}
		});
	};

	cacheTemplateSync = function (template) {
		template.cache = parseTemplateSync(template);	
		return null;	
	};		

	cacheTemplateByName = function (name, callback) {
		var foundTemplates, template;

		foundTemplates = getTemplatesByName(name);
		if (foundTemplates.length === 0) {
			callback(new Error("no template with the name " + name + " found!"));
		} else if (foundTemplates.length > 1 && !that.returnFirstTemplateOnMultipleMatches) {
			callback(new Error("too many templates with the name " + name + " found!"));
		} else {
			template = foundTemplates[0];
			cacheTemplate(template, function (err) {
				callback(err);
			});
		}
	};	

	cacheTemplateByNameSync = function (name) {
		var foundTemplates, template, data;

		foundTemplates = getTemplatesByName(name);
		if (foundTemplates.length === 0) {
			return new Error("no template with the name " + name + " found!");
		} else if (foundTemplates.length > 1 && !that.returnFirstTemplateOnMultipleMatches) {
			return new Error("too many templates with the name " + name + " found!");
		} else {
			template = foundTemplates[0];
			return cacheTemplateSync(template);	
		}
	};		

	cacheTemplateByPath = function (path, callback) {
		var template;

		template = getTemplateByPath(path);
		if (template instanceof Error) {
			callback(template);
		} else {
			cacheTemplate(template, function (err) {
				callback(err);
			});
		}
	};	

	cacheTemplateByPathSync = function (path) {
		var template, data;

		template = getTemplateByPath(path);
		if (template instanceof Error) {
			return template;
		} else {
			return cacheTemplateSync(template);	
		}
	};	

	cacheAllTemplates = function (callback) {
		var key, counter, decrementCounter, errors = [];

		counter = helper.getObjectLength(views);
		decrementCounter = function (err) {
			if (err instanceof Error) {
				errors.push(err.message);
			}
			counter -= 1;
			if (counter === 0) {
				callback(errors.length > 0 ? errors.join("\r\n") : null);
			}
		};
		for (key in views) {
			if (views.hasOwnProperty(key)) {
				cacheTemplate(views[key], decrementCounter);
			}
		}
	};

	cacheAllTemplatesSync = function () {
		var key, result, errors = [];

		for (key in views) {
			if (views.hasOwnProperty(key)) {
				result = cacheTemplateSync(views[key]);
				if (result instanceof Error) {
					error.push(result.message);
				}
			}
		}

		return errors.length > 0 ? errors.join("\r\n") : null;
	};	

	interpretTemplate = function (template, context) {
		var cache;

		cache = template.cache;
		if (cache === null) {
			cache = parseTemplateSync(template);
			if (that.cacheTemplatesOnFirstRequest) {
				template.cache = cache;
			}
		}
		return interpreter.produceHTML(cache, context);	
	};

	requestTemplateByName = function (name, context) {
		var foundTemplates, template;

		foundTemplates = getTemplatesByName(name);
		if (foundTemplates.length === 0) {
			return new Error("no template with the name " + name + " found!");
		} else if (foundTemplates.length > 1 && !that.returnFirstTemplateOnMultipleMatches) {
			return new Error("too many templates with the name " + name + " found!");
		} else {
			template = foundTemplates[0];
			return interpretTemplate(template, context);
		}
	};	

	requestTemplateByPath = function (path, context) {
		var template, cache;

		template = getTemplateByPath(path);
		if (template instanceof Error) {
			return template;
		} else {
			return interpretTemplate(template, context);
		}
	};

	clearCache = function () {
		var key;

		for (key in views) {
			if (views.hasOwnProperty(key)) {
				views[key].cache = null;
			}
		}
	};	

	clearRegister = function () {
		views = {};
	};

	return that;
}({}));

module.exports = leif;
