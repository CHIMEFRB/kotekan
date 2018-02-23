#include "hsaCommandFactory.hpp"
#include <stdio.h>
#include <stdlib.h>
#include "errors.h"
#include <errno.h>
#include <iostream>
#include <vector>

#include "json.hpp"


hsaCommandFactory::hsaCommandFactory(Config& config_,
                                     const string &unique_name_,
                                     bufferContainer &host_buffers_,
                                     hsaDeviceInterface& device_) :
                                        config(config_),
                                        device(device_),
                                        host_buffers(host_buffers_),
                                        unique_name(unique_name_){

    auto known_commands = hsaCommandFactoryRegistry::getRegisteredCommands();
    for (auto it = known_commands.begin(); it != known_commands.end(); ++it){
        INFO("Registered HSA Command: %s",it->first.c_str());
    }

    vector<json> commands = config.get_json_array(unique_name, "commands");

    for (uint32_t i = 0; i < commands.size(); i++){
        auto cmd = create(commands[i]["name"], config, unique_name, host_buffers, device);
        list_commands.push_back(cmd);
    }
}

hsaCommandFactory::~hsaCommandFactory() {
    for (auto command : list_commands) {
        delete command;
    }
}

vector<hsaCommand*>& hsaCommandFactory::get_commands() {
    return list_commands;
}

hsaCommand* hsaCommandFactory::create(const string &name,
                                      Config& config,
                                      const string &unique_name,
                                      bufferContainer &host_buffers,
                                      hsaDeviceInterface& device) const
{
    auto known_commands = hsaCommandFactoryRegistry::getRegisteredCommands();
    auto i = known_commands.find(name);
    if (i == known_commands.end())
    {
        ERROR("Unrecognized HSA command! (%s)", name.c_str());
        throw std::runtime_error("Unrecognized hsaCommand!");
    }
    hsaCommandMaker* maker = i->second;
    return maker->create(config,unique_name,host_buffers,device);
}



void hsaCommandFactoryRegistry::hsaRegisterCommand(const std::string& key, hsaCommandMaker* cmd)
{
    hsaCommandFactoryRegistry::Instance().hsaReg(key,cmd);
}

std::map<std::string, hsaCommandMaker*> hsaCommandFactoryRegistry::getRegisteredCommands(){
    return hsaCommandFactoryRegistry::Instance()._hsa_commands;
}


hsaCommandFactoryRegistry& hsaCommandFactoryRegistry::Instance() {
    static hsaCommandFactoryRegistry factory;
    return factory;
}

hsaCommandFactoryRegistry::hsaCommandFactoryRegistry(){}

void hsaCommandFactoryRegistry::hsaReg(const std::string& key, hsaCommandMaker* cmd)
{
    if (_hsa_commands.find(key) != _hsa_commands.end())
    {
        ERROR("Multiple HSA Commands registered as '%s'!",key.c_str());
        throw std::runtime_error("An hsaCommand was registered twice!");
    }
    _hsa_commands[key] = cmd;
}
