var path      = require('path')
  , fs        = require('fs')
  , helpers   = require(path.resolve(__dirname, '..', 'helpers'))
  , args      = require('yargs').argv
  , _         = require('lodash')
  , Sequelize = require('sequelize')

module.exports = {
  "migrate": {
    descriptions: {
      short: "Run pending migrations.",
      long: [
        "The command runs every not yet executed migration.",
      ],
      options: {
        "--coffee": "If enabled, the generated migration file will use coffee script. Default: false",
        "--config": "The path to the config file."
      }
    },

    task: function() {
      if (helpers.config.configFileExists() || args.url) {
        var config  = null
          , options = {}

        try {
          config = helpers.config.readConfig()
        } catch(e) {
          console.log(e.message)
          process.exit(1)
        }

        _.each(config, function(value, key) {
          if(['database', 'username', 'password'].indexOf(key) == -1) {
            options[key] = value
          }

          if (key === "use_env_variable") {
            if (process.env[value]) {
              var db_info = process.env[value].match(/([^:]+):\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

              config.database = db_info[6];
              config.username = db_info[2];
              config.password = db_info[3];

              options = _.extend(options, {
                host: db_info[4],
                port: db_info[5],
                dialect: db_info[1],
                protocol: db_info[1]
              });
            }
          }
        })

        options = _.extend(options, { logging: false })

        var sequelize       = new Sequelize(config.database, config.username, config.password, options)
          , migratorOptions = { path: helpers.migration.getMigrationsPath() }

        if (helpers.config.supportsCoffee()) {
          migratorOptions = _.merge(migratorOptions, { filesFilter: /\.js$|\.coffee$/ })
        }

        var migrator = sequelize.getMigrator(migratorOptions)

        sequelize.authenticate().success(function () {
          migrator.migrate().success(function() {
            process.exit(0)
          })
        }).error(function (err) {
          console.error("Unable to connect to database: " + err)
        })
      } else {
        console.log('Cannot find "' + helpers.config.getConfigFile() + '". Have you run "sequelize init"?')
        process.exit(1)
      }
    }
  }
}